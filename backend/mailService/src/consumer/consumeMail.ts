import dotenv from "dotenv";
dotenv.config();
import amqplib, { Channel, ChannelModel } from "amqplib";
import { sendOtpMail } from "../utils/sendOtp.js";

let connection: ChannelModel | null = null;
/*   the queue name used in your userController when publishing a message to RabbitMQ
     must exactly match the queue name used by the consumer to receive and process it.
*/
const EXCHANGE_NAME = "otp_exchange";
const QUEUE_NAME = "otp_queue";
const ROUTING_KEY = "send-otp";

const DLQ_QUEUE = `${QUEUE_NAME}_dlq`;
const DLQ_ROUTING_KEY = `${ROUTING_KEY}_dlq`;

// --------------------------------------------------------------------------------------------------------
export const connectRabbitMQ = async (): Promise<ChannelModel> => {
  if (connection) return connection;

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
  } catch (error) {
    console.error("❌ Mail Service failed to connect to RabbitMQ", error);
    throw error;
  }
};
// --------------------------------------------------------------------------------------------------------

export const consumeOtpQueue = async () => {
  try {
    const connection = await connectRabbitMQ();

    const channel: Channel = await connection.createChannel();
    channel.prefetch(1); // process one message at the time

    await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });

    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      deadLetterExchange: EXCHANGE_NAME,
      deadLetterRoutingKey: DLQ_ROUTING_KEY,
    });
    await channel.assertQueue(DLQ_QUEUE, { durable: true });

    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
    await channel.bindQueue(DLQ_QUEUE, EXCHANGE_NAME, DLQ_ROUTING_KEY);

    console.log(`📥 Listening to queue: "${QUEUE_NAME}"`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;
      try {
        const { email, otp } = JSON.parse(msg.content.toString());
        if (!email || !otp) {
          throw new Error("Invalid OTP payload received");
        }
        await sendOtpMail({
          to: email,
          subject: "Your OTP Code",
          html: `
            <p style="font-size: 16px;">Hello,</p>
            <p>Your OTP is:</p>
            <p><strong style="font-size: 20px; color: blue;">${otp}</strong></p>
            <p>This OTP is valid for 5 minutes.</p>
          `,
        });
        console.log(`✅ OTP email sent to: ${email}`);
        channel.ack(msg);
      } catch (error) {
        console.error("❌ Failed to process OTP message:", error);
        channel.nack(msg, false, false); // reject and route to DLQ automatically
      }
    });
  } catch (error) {
    console.log("consumeOtp error: ", error);
  }
};
// --------------------------------------------------------------------------------------------------------
