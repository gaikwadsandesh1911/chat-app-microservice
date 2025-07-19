import dotenv from 'dotenv';
dotenv.config();
import amqplib from 'amqplib';
import { CustomError } from '../utils/CustomError.js';
let connection = null; // must be only one connection per service
let publisherChannel = null; // more than one channel can be create, here we need only one
const EXCHANGE_NAME = 'otp_exchange';
const QUEUE_NAME = 'otp_queue';
const ROUTING_KEY = 'send-otp';
const DLQ_NAME = `${QUEUE_NAME}_dlq`;
const DLQ_ROUTING_KEY = `${ROUTING_KEY}_dlq`;
// -----------------------------------------------------------------------------------------------------------------
export const connectRabbitMQ = async () => {
    // Prevent double connection
    if (connection && publisherChannel) {
        console.log("🐇 Already connected to RabbitMQ.");
        return;
    }
    try {
        const connectionOptions = {
            protocol: process.env.RABBITMQ_PROTOCOL || 'amqp',
            hostname: process.env.RABBITMQ_HOST || 'localhost',
            port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
            username: process.env.RABBITMQ_DEFAULT_USER,
            password: process.env.RABBITMQ_DEFAULT_PASS,
            vhost: process.env.RABBITMQ_VHOST || '/',
        };
        // make connection with rabbitMQ, It a TCP connection between your application and the RabbitMQ (the messagebroker.)
        connection = await amqplib.connect(connectionOptions);
        // creating channel to send and recieve messages
        publisherChannel = await connection.createChannel();
        // Optional default queue creation, so there will be atleast one queue will be available
        await publisherChannel.assertQueue('default-queue', { durable: true });
        await publisherChannel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
        await publisherChannel.assertQueue(QUEUE_NAME, {
            durable: true,
            deadLetterExchange: EXCHANGE_NAME,
            deadLetterRoutingKey: DLQ_ROUTING_KEY,
        });
        await publisherChannel.assertQueue(DLQ_NAME, { durable: true });
        await publisherChannel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
        await publisherChannel.bindQueue(DLQ_NAME, EXCHANGE_NAME, DLQ_ROUTING_KEY);
        console.log('✅ RabbitMQ connected successfully to user service.');
    }
    catch (error) {
        console.error('❌ Failed to connect to RabbitMQ:', error);
        throw error; // when we call this function this error will be handled in there catch blcok
    }
};
// ----------------------------------------------------------------------------------------------------
export const sendOtpToQueue = async (otpPayload, options) => {
    const maxRetries = options.retries ?? 3;
    const delayMs = options.delayMs ?? 500;
    try {
        if (!publisherChannel) {
            throw new CustomError("RabbitMQ publisher channel is not initialized", 500);
            /*  send otp function is called inside login controller which is wrapped with asyncErrorHandler
                asyncErrorHandler catch the exception and passed to next() middleware
                and finally handled in globalErrrorHandler
            */
        }
        /* Converts the message (object or value) into a string and then to a Buffer.
           because RabbitMQ messages are always in Buffer format, not plain objects or strings.
        */
        const messageBuffer = Buffer.from(JSON.stringify(otpPayload));
        //  retries logic
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const isPublished = publisherChannel.sendToQueue(QUEUE_NAME, messageBuffer, {
                persistent: true
            });
            if (isPublished) {
                console.log(`📤 Message sent to queue "${QUEUE_NAME}":`, otpPayload);
                return true;
            }
            else {
                console.log(` Attempt ${attempt} - Failed to publish to "${QUEUE_NAME}".`);
                await new Promise((res) => setTimeout(res, delayMs)); // wait for 500ms to make attemp++  
            }
        }
        console.warn(`❌ Max retries exceeded. OTP not delivered.`);
        return false;
    }
    catch (error) {
        console.error('❌ Failed to publish message to queue:', error);
        throw new CustomError("An unexpected error occurred while sending OTP", 500);
        // Network errors, serialization failures, RabbitMQ internal errors, etc. // fallback
    }
};
// ----------------------------------------------------------------------------------------------------
// gracefully close RabbitMQ
export const closeRabbitMQ = async () => {
    try {
        if (publisherChannel) {
            await publisherChannel.close();
            publisherChannel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        console.log('👋 RabbitMQ connection closed.');
    }
    catch (error) {
        console.error('❌ Failed to close RabbitMQ connection:', error);
    }
};
/* RabbitMQ is designed to minimize TCP connection overhead.
    Instead of making a new TCP connection per task, we: Open one connection
    .Keep one connection per app/service
    .Use multiple channels for publishing, consuming, etc.

    const channel1 = await connection.createChannel(); // for publishing
    const channel2 = await connection.createChannel(); // for consuming

    Responsibilities of channel

    1. Ensures a queue exists using assertQueue()
    2. Ensures an exchange exists using assertExchange()
    3. Connects queues to exchanges with bindQueue()
    4. Sends messages to queues or exchanges using sendToQueue() or publish()
    5. Listens to messages from a queue using consume()
    6. Confirms message receipt using ack(), nack(), or reject()

    Connection = a big road connecting your app to RabbitMQ (TCP connection).
    Channel = a dedicated lane on that road for sending/receiving messages.
*/ 
