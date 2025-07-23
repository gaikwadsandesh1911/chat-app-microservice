import dotenv from "dotenv";
dotenv.config();
import amqplib from "amqplib";
let connection = null;
export const connectRabbitMQ = async () => {
    if (connection)
        return connection;
    try {
        const connectionOptions = {
            protocol: process.env.RABBITMQ_PROTOCOL || "amqp",
            hostname: process.env.RABBITMQ_HOST || "localhost",
            port: parseInt(process.env.RABBITMQ_PORT || "5672", 10),
            username: process.env.RABBITMQ_DEFAULT_USER,
            password: process.env.RABBITMQ_DEFAULT_PASS,
            vhost: process.env.RABBITMQ_VHOST || "/",
        };
        connection = await amqplib.connect(connectionOptions);
        console.log("✅ RabbitMQ connected successfully to Mail service.");
        return connection;
    }
    catch (error) {
        console.error("❌ Mail Service failed to connect to RabbitMQ", error);
        throw error;
    }
};
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
