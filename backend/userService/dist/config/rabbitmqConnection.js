import dotenv from 'dotenv';
dotenv.config();
import amqplib from 'amqplib';
let connection = null; // must be only one connection per service
export const connectRabbitMQ = async () => {
    if (connection)
        return connection;
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
        console.log('✅ RabbitMQ connected successfully to User Service.');
        return connection;
    }
    catch (error) {
        console.error('❌ User Service Failed to connect to RabbitMQ:', error);
        throw error; // when we call this function this error will be handled in there catch blcok
    }
};
// ----------------------------------------------------------------------------------------------------
// gracefully close RabbitMQ
export const closeRabbitMQ = async () => {
    try {
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
/*  data is sent to exchange first instead of Queue directly.
    because exchange decides where data should go based on routing key.
    and..exchange and queue are connected througn binding_key.

    why we send data to exchange ? because
    One message can go to multiple queues, no queue, or the perticular queue based on rules(or based on routing logic or exchange type).

    Different Routing Logics (Exchange Types):
    1. Direct Exchange: Routes based on exact match of routing key.
    2. Fanout Exchange: Broadcasts to all queues.
    3. Topic Exchange: Pattern matching (wildcards).
    4. Headers Exchange: Routes based on headers instead of routing key.

    Retry mechanisms, Dead Letter Queues (DLQ), Priority Queues, etc., depend on exchange-based routing.

    RabbitMQ uses Exchange as a powerful routing layer to handle message delivery logic.
*/
/*
  🧠 RabbitMQ consume is asynchronous and event-driven, but your controller expects a response in a request-response style.
      So you cannot directly await listenToMailStatus() because it doesn't return a value immediately — it’s a long-lived listener.
      so we have to create custom respone, like we will return new Promise(()=>)
*/
