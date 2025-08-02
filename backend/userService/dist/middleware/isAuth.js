import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { CustomError } from "../utils/CustomError.js";
export const isAuth = asyncErrorHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer'))
        return next(new CustomError("Authorization header missing or malformed. Please, Login again !", 401));
    const token = authHeader.split(" ")[1];
    const decodeToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log({ decodeToken }); // at the time of jwt.sign() we set properties that will be available here
    if (decodeToken != null) {
        req.user = decodeToken;
        return next();
    }
    return next(new CustomError("Invalid Token Payload", 401));
});
