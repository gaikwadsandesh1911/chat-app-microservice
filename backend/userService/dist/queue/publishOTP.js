import { connectRabbitMQ } from "../config/rabbitmqConnection.js";
import { CustomError } from "../utils/CustomError.js";
const OTP_EXCHANGE = "email.otp.exchange";
const OTP_QUEUE = "email.otp.queue";
const OTP_ROUTING_KEY = "email.otp.send";
const OTP_DLQ = "email.otp.queue.dlq";
const OTP_DLQ_ROUTING_KEY = "email.otp.send.dlq";
export const publishOTP = async (otpPayload) => {
    const maxRetries = 3;
    const delayMs = 500;
    try {
        const connection = await connectRabbitMQ();
        // creating channel to send and recieve messages
        const channel = await connection.createChannel();
        // create exchane
        await channel.assertExchange(OTP_EXCHANGE, 'direct', { durable: true });
        // // create queue
        await channel.assertQueue(OTP_QUEUE, {
            durable: true,
            /*  If a message is rejected (via channel.nack() or unacked after consumer crash and requeue=false),
                it is sent to: email.otp.exchange again
                using routing key email.otp.send.dlq (thus routed to DLQ)
            */
            deadLetterExchange: OTP_EXCHANGE,
            deadLetterRoutingKey: OTP_DLQ_ROUTING_KEY,
        });
        // create queue for dlq
        await channel.assertQueue(OTP_DLQ, { durable: true });
        // bind exchange and queues through routing key
        await channel.bindQueue(OTP_QUEUE, OTP_EXCHANGE, OTP_ROUTING_KEY);
        await channel.bindQueue(OTP_DLQ, OTP_EXCHANGE, OTP_DLQ_ROUTING_KEY);
        /*  RabbitMQ accept messages in Buffer format only, not plain objects or strings.
            Converts the message (object or value) into a string and then to a Buffer.
        */
        const messageBuffer = Buffer.from(JSON.stringify(otpPayload));
        /* retries logic..
          if message is successfullly publish it return true,[ channel.publish() returns true or false ]
          or else come to else part will wait there for 500ms and make second attempt ( backpressure handling => may buffer is full to consumed new data)
        */
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const isPublished = channel.publish(OTP_EXCHANGE, OTP_ROUTING_KEY, messageBuffer, {
                persistent: true
            });
            // channel.publish() returns true or false
            if (isPublished) {
                console.log(`📤 Message sent to queue "${OTP_EXCHANGE}":`, otpPayload);
                return true; // exit the loop and function early
            }
            else {
                // If Failed to Publish (Backpressure)
                console.log(` Attempt ${attempt} - Failed to publish to "${OTP_EXCHANGE}".`);
                // await new Promise((resolve) => setTimeout(resolve, delayMs)); // wait for 500ms to make attemp++  
                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, delayMs);
                });
                // it pause the loop => once delay complete => attempt++
            }
        } // end of retry logic
        console.warn(`❌ Max retries exceeded. OTP could not publish into exchange.`);
        return false;
    }
    catch (error) {
        console.error('❌ Failed to publish OTP into exchange:', error);
        throw new CustomError("An unexpected error occurred while publish otp into queue", 500);
        // Network errors, serialization failures, RabbitMQ internal errors, etc. // fallback
    }
};
/*
    Backpressure occurs when the producer (sender) is sending data faster than the consumer (receiver) or system can process or handle.
    Where You Encounter Backpressure:
    Streams in Node.js	Writable stream’s internal buffer fills up
    RabbitMQ (amqplib)	Channel's internal TCP buffer is full
    HTTP APIs	Too many requests, the server responds slowly
    File writes	Disk I/O slower than write rate
*/
