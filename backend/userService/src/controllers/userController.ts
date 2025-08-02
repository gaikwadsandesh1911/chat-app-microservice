import { Request, Response, NextFunction } from "express";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { redisClient,} from "../config/redisConnection.js";
import { publishOTP } from "../queue/publishOTP.js";
import { CustomError } from "../utils/CustomError.js";
import { nanoid } from 'nanoid';
import {  User } from "../models/userSchema.js";
import { generateJwtToken } from "../utils/generateJwtToken.js";
import { AuthRequest } from "../middleware/isAuth.js";

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

    // if not rateLimitKey is not present in redis
    // generate six digit otp and store in redis
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `otp:${email}`;  // unique otpKey
    await redisClient.set(otpKey, otp, {
        EX: 300, // 300sec = 5min
    });

    // rate limit this route for next 1min
    await redisClient.set(rateLimitKey, "true", {
        EX: 60
    });

    // ----------------------------------------------------------------------------------------------

     /*
        keep track of otp Status using nanoid(). in redis, so we know if otp is sent or not to perticular email
        initially status is set as pending. once mail service consume otp from rabbitmq.
        and as we got inform from nodemailer on consumer service we change status to sent
        on uri we check if otp is delivered or not
    */   
    const otpTrackingId = nanoid(); // generate uniqueId
    const OTP_STATUS = {
        PENDING: "pending",
        FAILED: "failed",
        SENT: "sent", // optional, if needed later
    };
    // track otp status
    await redisClient.set(`otp:status:${otpTrackingId}`, OTP_STATUS.PENDING, {
        EX: 300  // 5min
    });

    // this payload will publish in rabbitmq.
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
        message: 'OTP is being deliverd, please wait...',
        otpTrackingId
    });
        
});

// ----------------------------------------------------------------------------------------------------
// to test if otp is successfully delivered or not to end user through nodemailer
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

// ----------------------------------------------------------------------------------------------------

const verifyUser = asyncErrorHandler( async(req: Request, res: Response, next: NextFunction)=>{

    const email = req.body.email?.trim();
    const otp = req.body.otp;
    if (!email || !otp) {
        return next(new CustomError("Email and OTP are required", 400));
    } 
    
    const otpKey = `otp:${email}`;  // thats how we stored opt in redis
    const storedOTP = await redisClient.get(otpKey);
    if(!storedOTP || storedOTP != otp){
        return next(new CustomError("OTP expired or Invalid", 400));
    } 

    // if otp and stored otp matches we delete used otp key
    await redisClient.del(otpKey);

    // if user is not alredy in database, save the user in database
    let user = await User.findOne({email});
    if(!user){
        const name = `${email.split("@")[0]}_${Date.now()}`;
        user = await User.create({name, email});
    }

    // otherwise generate token and send in response.
    const token = generateJwtToken({userId: user._id, email: user.email, name: user.name});

    return res.status(200).json({
        status: 'success',
        message: 'OTP verified. Login successful.',
        token,
        user
    });
});

// ----------------------------------------------------------------------------------------------------

const myProfile = asyncErrorHandler( async(req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    if(!user) return next(new CustomError("User not found", 404));
    return res.json({
        user
    });
});

// ----------------------------------------------------------------------------------------------------

const updateName = asyncErrorHandler( async (req: AuthRequest, res: Response, next: NextFunction) => {
    
    const userId = req.user?.userId;
    const { name } = req.body;

    if(!name) return next(new CustomError("Name is required", 400));

    const updatedUser = await User.findByIdAndUpdate(userId, { name }, { new: true, runValidators: true});
    if (!updatedUser) return next(new CustomError("User not found", 404));
  
    // since name is not part of jwt.sign() so we do not need to  generate new token after name update
    return res.status(200).json({
        status: "success",
        message: "Name updated successfully",
        user: updatedUser,
    });
    
});

// ----------------------------------------------------------------------------------------------------

const getAllUsers = asyncErrorHandler( async (req: AuthRequest, res: Response, next: NextFunction) => {
    const allUsers = await User.find();
    return res.json({
        status: 'success',
        users: allUsers
    })
});


// ----------------------------------------------------------------------------------------------------

const getUser = asyncErrorHandler( async (req:Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);
    if(!user) return next(new CustomError("User Not Found", 404));
});

export { loginUser, getOtpStatusByOtpTrackingId, verifyUser, myProfile, updateName, getAllUsers, getUser };


/* 
    on /login req we generate otp and send in queue system, consumer service consume token and send to user through mail
    on /verify-otp =>
        if user not present in db then save the user in db
        if user is already present generate token and sends in response.
    with that jwt token set in header, user do further...
*/