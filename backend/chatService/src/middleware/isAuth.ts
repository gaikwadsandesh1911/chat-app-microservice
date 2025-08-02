import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';
dotenv.config();
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/CustomError.js";

interface IUser extends Document {
 userId: any;
 name: string;
 email: string;
}

export interface AuthRequest extends Request {
    user?: IUser | null;  // on req object created user property
}

export const isAuth = asyncErrorHandler( async(req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer')) return next(new CustomError("Authorization header missing or malformed. Please, Login again !", 401));
    const token = authHeader.split(" ")[1];
    
    const decodeToken = jwt.verify(token, process.env.JWT_SECRET as string);
    console.log({decodeToken});
    if(decodeToken != null){
        req.user = decodeToken as IUser;
        return next();
    }
    return next (new CustomError("Invalid Token Payload", 401));

});