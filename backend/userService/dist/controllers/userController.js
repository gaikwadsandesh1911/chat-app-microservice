import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import redisClient from "../config/redisConnection.js";
import { sendOtpToQueue } from "../config/rabbitmqConnection.js";
import { CustomError } from "../utils/CustomError.js";
const loginUser = asyncErrorHandler(async (req, res, next) => {
    const { email } = req.body;
    if (!email || typeof email !== "string")
        throw new CustomError("Email is required to login", 400);
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail))
        throw new CustomError("Invalid email format", 400);
    // create rateLimitKey => we use upstash redis
    const rateLimitKey = `otp:rateLimit:${email}`; // unique rateLimitKey
    // if rateLimitKey already exists in the redis .we have to prevent user from generating otp more often(within 1min)
    const isRateLimited = await redisClient.get(rateLimitKey);
    if (isRateLimited) {
        // if rateLimitKey already available in redis
        throw new CustomError("Too many requests. Please wait before requesting another OTP.", 429);
    }
    // generate six digit otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // create otpKey and store otp in redis for 5min
    const otpKey = `otp:${email}`; // unique otpKey
    await redisClient.set(otpKey, otp, {
        EX: 300, // 300sec = 5min
    });
    // This prevents the user for 60 seconds from requesting a new OTP 
    await redisClient.set(rateLimitKey, "true", {
        EX: 60
    });
    const otpPayload = {
        email,
        otp
    };
    // separate module to send otp in rabbitmq
    const isPublished = await sendOtpToQueue(otpPayload, { retries: 3, delayMs: 500 });
    if (!isPublished) {
        return res.status(200).json({
            status: 'fail',
            message: "Failed to publish OTP. Please try again shortly.",
        });
    }
    return res.status(200).json({
        status: 'success',
        message: "OTP has been published successfully to your email",
    });
});
export { loginUser };
/*
    1. once user login with email we generate otp and publish it into rabbitmq queue
    whith message obj.

    2. mail service consume that from rabbitmq and send through nodemailer to pertcular user

    this is how we get otp.
    
*/ 
