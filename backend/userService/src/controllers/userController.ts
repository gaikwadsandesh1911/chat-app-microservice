import { Request, Response, NextFunction } from "express";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { redisClient, closeRedis } from "../config/redisConnection.js";
import { publishOTP } from "../queue/publishOTP.js";
import { CustomError } from "../utils/CustomError.js";
import { nanoid } from 'nanoid';

const loginUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
    
    // validate email
    const { email } = req.body;
    if (!email || typeof email !== "string") throw new CustomError("Email is required to login", 400);
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) throw new CustomError("Invalid email format", 400);

    // Rate limiting using redis
    const rateLimitKey = `otp:rateLimit:${email}`; // unique Key
    // if rateLimitKey already exists in the redis .we have to prevent user from generating otp more often(within 1min)
    const isRateLimited = await redisClient.get(rateLimitKey);
    if (isRateLimited) {
        // if rateLimitKey already available in redis
    throw new CustomError("Too many requests. Please wait before requesting another OTP.", 429);
  }

    // generate six digit otp and store in redis
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `otp:${email}`;  // unique otpKey
    await redisClient.set(otpKey, otp, {
        EX: 300, // 300sec = 5min
    });

    // rate limit logic set it for 1min so user can't make new req within 1min. so can't generate new otp
    await redisClient.set(rateLimitKey, "true", {
        EX: 60
    });

    // ----------------------------------------------------------------------------------------------

    const otpTrackingId = nanoid(); // generate uniqueId
    const OTP_STATUS = {
        PENDING: "pending",
        FAILED: "failed",
        SUCCESS: "success", // optional, if needed later
    }
    // track otp status
    await redisClient.set(`otp:status:${otpTrackingId}`, OTP_STATUS.PENDING, {
        EX: 300  //
    })
    const otpPayload = {
        email,
        otp,
        otpTrackingId
    };

    // separate module to send otp in rabbitmq
    const isPublished = await publishOTP(otpPayload);

    if (!isPublished) {
        // await redisClient.del(`otp:status:${otpTrackingId}`) // it release some memory, but it's not achive releabilty and traceability
        await redisClient.set(`otp:status:${otpTrackingId}`, OTP_STATUS.FAILED, { EX: 300 });
        return res.status(500).json({
            status: "fail",
            message: "Failed to publish OTP in RabbitMQ. Please try again shortly.",
        });
    }

    return res.json({
        status: 'pending',
        message: 'OTP is being deliverd',
        otpTrackingId
    });
        
});

// ----------------------------------------------------------------------------------------------------

const getOtpStatusByOtpTrackingId = asyncErrorHandler(async(req: Request, res: Response, next: NextFunction)=>{
    const { otpTrackingId } = req.params;
    const otpStatus = await redisClient.get(`otp:status:${otpTrackingId}`);
    if(!otpStatus){
        return next(new CustomError('could not fetch otp status', 400));
    }
    return res.status(200).json({
        status: otpStatus
    })
});
export { loginUser, getOtpStatusByOtpTrackingId };
