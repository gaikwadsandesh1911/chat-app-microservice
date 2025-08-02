import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const generateJwtToken = (payload: {userId: any, email: string, name: string }) => {
     return jwt.sign(payload, process.env.JWT_SECRET as string, {expiresIn: '15d'});
}