import amqplib from 'amqplib';

import dotenv from 'dotenv';
dotenv.config();

let channel: amqplib.Channel | null = null;
let connection: amqplib.ChannelModel | null = null;

// rabbitMQ connection
export const connectRabbitMQ = async (): Promise<void> => {
  try {

    const connectionOptions = {
      protocol: process.env.RABBITMQ_PROTOCOL || 'amqp',
      hostname: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
      username: process.env.RABBITMQ_USER,
      password: process.env.RABBITMQ_PASS,
      vhost: process.env.RABBITMQ_VHOST || '/',
    };

    connection = await amqplib.connect(connectionOptions);
    channel = await connection.createChannel();

    console.log('✅ RabbitMQ connected successfully.');

    // Optional default queue creation
    const defaultQueue = 'default_queue';
    await channel.assertQueue(defaultQueue, { durable: true });

  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------------------------------------

export const getRabbitChannel = (): amqplib.Channel => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
};

// ----------------------------------------------------------------------------------------------------

export const publishToQueue = async (queueName: string, message: unknown): Promise<boolean> => {
  try {
    
    const channel = getRabbitChannel();

    // Make sure the queue exists (optional but safe)
    await channel.assertQueue(queueName, { durable: true });

    const messageBuffer = Buffer.from(JSON.stringify(message));

    const published = channel.sendToQueue(queueName, messageBuffer, {
      persistent: true, // ensures message survives RabbitMQ restart (if queue is also durable)
    });

    if (published) {
      console.log(`📤 Message sent to queue "${queueName}":`, message);
    } else {
      console.warn(`⚠️ Message NOT sent to queue "${queueName}".`);
    }

    return published;
  } catch (error) {
    console.error('❌ Failed to publish message to queue:', error);
    return false;
  }
};

// ----------------------------------------------------------------------------------------------------
// gracefully close RabbitMQ
export const closeRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }

    if (connection) {
      await connection.close();
      connection = null;
    }

    console.log('👋 RabbitMQ connection closed.');
  } catch (error) {
    console.error('❌ Failed to close RabbitMQ connection:', error);
  }
};