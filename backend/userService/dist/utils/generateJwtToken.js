import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
export const generateJwtToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15d' });
};
