import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document{
    name: string,
    email: string
};

const userSchema: Schema<IUser> = new Schema({
    name: {
        type: String,
        required: [true, 'name is required']
    },
    email: {
        type: String,
        required: [true, 'email is required'],
        unique: true
    }
},{timestamps: true});

export const User = mongoose.model<IUser>('User', userSchema);

