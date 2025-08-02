import { IUser } from "../models/userSchema.js";
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';
dotenv.config();
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/CustomError.js";

export interface AuthRequest extends Request {
    user?: IUser | null;
}

export const isAuth = asyncErrorHandler( async(req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer')) return next(new CustomError("Authorization header missing or malformed. Please, Login again !", 401));
    const token = authHeader.split(" ")[1];
    
    const decodeToken = jwt.verify(token, process.env.JWT_SECRET as string);
    console.log({decodeToken});     // at the time of jwt.sign() we set properties that will be available here
    if(decodeToken != null){
        req.user = decodeToken as IUser;
        return next();
    }
    return next (new CustomError("Invalid Token Payload", 401));

});