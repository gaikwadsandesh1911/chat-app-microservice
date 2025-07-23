import dotenv from "dotenv";
dotenv.config();
import { sendOtpToMail } from "../utils/sendOtp.js";
import { connectRabbitMQ } from "../config/connectRabbitMQ.js";
import { redisClient } from "../config/connectRedis.js";
const OTP_EXCHANGE = "email.otp.exchange";
const OTP_QUEUE = "email.otp.queue";
const OTP_ROUTING_KEY = "email.otp.send";
const OTP_DLQ = "email.otp.queue.dlq";
const OTP_DLQ_ROUTING_KEY = "email.otp.send.dlq";
const RETRY_DELAY_QUEUE = "email.otp.retry_delay_queue"; // Retry queue with TTL delay
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000; // 10 seconds
// --------------------------------------------------------------------------------------------------------
export const consumeOTP = async () => {
    try {
        const connection = await connectRabbitMQ();
        const channel = await connection.createChannel();
        channel.prefetch(1); // process one message at the time
        // create exchange
        await channel.assertExchange(OTP_EXCHANGE, 'direct', { durable: true });
        // create queuq if we failed to consume message it is sent to dlq via same exchange
        await channel.assertQueue(OTP_QUEUE, {
            durable: true,
            deadLetterExchange: OTP_EXCHANGE,
            deadLetterRoutingKey: OTP_DLQ_ROUTING_KEY,
        });
        // create death letter queue
        await channel.assertQueue(OTP_DLQ, { durable: true });
        // binding exchange with queue
        await channel.bindQueue(OTP_QUEUE, OTP_EXCHANGE, OTP_ROUTING_KEY);
        await channel.bindQueue(OTP_DLQ, OTP_EXCHANGE, OTP_DLQ_ROUTING_KEY);
        // Retry delay queue with TTL, ( it consumed message from dlq );
        await channel.assertQueue(RETRY_DELAY_QUEUE, {
            durable: true,
            messageTtl: RETRY_DELAY_MS, // message sent to this queue remains here for 10000; // 10 seconds
            deadLetterExchange: OTP_EXCHANGE, // after TTL, message goes here => main exchange
            deadLetterRoutingKey: OTP_ROUTING_KEY, // same as original routing key means it goes in main-queue
            // After 10s, it goes back to main queue via OTP_EXCHANGE_NAME and OTP_ROUTING_KEY.
        });
        channel.consume(OTP_QUEUE, async (msg) => {
            console.log("rabbitMq consumer message", { msg });
            if (!msg)
                return;
            try {
                // message or data on rabbitmq is in buffer format need to convert it into string and then into object
                const { email, otp, otpTrackingId } = JSON.parse(msg.content.toString());
                if (!email || !otp) {
                    throw new Error("Invalid OTP payload received");
                }
                // send otp to email ( nodemailer and smtp)
                const isOtpSent = await sendOtpToMail({
                    to: email,
                    subject: "Your OTP Code",
                    html: `
            <p style="font-size: 16px;">Hello,</p>
            <p>Your OTP is:</p>
            <p><strong style="font-size: 20px; color: blue;">${otp}</strong></p>
            <p>This OTP is valid for 5 minutes.</p>
          `,
                });
                if (isOtpSent) {
                    // update status in redis for client
                    await redisClient.set(`otp:status:${otpTrackingId}`, 'sent', {
                        EX: 300
                    });
                    channel?.ack(msg); // delete message from queue
                }
                else {
                    // update status in redis for client
                    await redisClient.set(`otp:status:${otpTrackingId}`, 'failed', {
                        EX: 300
                    });
                    channel?.nack(msg, false, false); // send to message to dlq
                }
            }
            catch (error) {
                console.error("❌ Failed to process OTP message and sending to dlq:", error);
                channel?.nack(msg, false, false); // reject and route to DLQ automatically
            }
        });
    }
    catch (error) {
        console.log("consumeOtp error: ", error);
        throw error;
    }
};
// --------------------------------------------------------------------------------------------------------
/* while consuming message from main queue if there is an error
(smtp service may not available. message is sent to death-letter-queue)
 as we see in catch block... channel?.nack(msg, false, false);
*/
/* since message is in death-letter-queue, now try to consume message from death-letter-queue
    and sent to RETRY_DELAY_QUEUE
    message sent to retr-delay-queue statys there for 10sec and then again send
    to our main queue via main exchange.

    now we can consume it from main queue and send to end user
*/
export const retryFromDLQ = async () => {
    try {
        const connection = await connectRabbitMQ();
        const channel = await connection.createChannel();
        channel.prefetch(1);
        channel.consume(OTP_DLQ, async (msg) => {
            if (!msg)
                return;
            try {
                const headers = msg.properties.headers || {}; // initially we have
                const retryCount = headers["x-retry-count"] || 0; // set x-retry-count property.
                // if retry count greater than 3 we set to permananat delete the message from dlq
                if (retryCount > MAX_RETRIES) {
                    console.error(`💀Max retries reached.${msg.content.toString()} permanently deleted from dlq:`);
                    // TODO: Save permanently failed message to DB or alert system
                    return channel.ack(msg); // delete from dlq
                }
                console.log(`🔁 Retrying message (Attempt ${retryCount}):`);
                /* if retryCount < 3 try to send it in retry-delay-queue
                  message sent to retry-delay-queue stays  for 10 seconds.
                */
                channel.sendToQueue(RETRY_DELAY_QUEUE, msg.content, {
                    persistent: true,
                    headers: {
                        "x-retry-count": retryCount + 1,
                    },
                });
                channel.ack(msg); // remove from DLQ 
            }
            catch (err) {
                console.error("❌ Failed retry from DLQ:", err);
                channel.nack(msg, false, false); // optional: dead-letter again
            }
        });
    }
    catch (err) {
        console.error("consumeOtpDlq error: ", err);
        throw err;
    }
};
// --------------------------------------------------------------------------------------------------------
/*  channel.ack(msg) is a method used by consumers to manually acknowledge that a message has been successfully processed.
    If you call channel.ack(msg): RabbitMQ removes the message from the queue immediately

    1. comment channel.ack() and set {noAck: false}(by default : true. depends on libray version) you will be able see message in rabbitmq management dashboard.
    // channel.ack()
    channel.consume(queueName, () => {
    }, { noAck: false })
*/
/*

    [Main Queue] --if failed----> [DLQ]
                             |
                             v (retryFromDLQ.js)
                         Check retryCount
                             |
              +--------------+--------------+
              |                             |
         retryCount < 3              retryCount >= 3
              |                             |
              v                             v
    Send to RETRY_DELAY_QUEUE         Save to DB / Discard
              |
              v (after TTL)
   Routed back to OTP_EXCHANGE → Main Queue


*/ 
