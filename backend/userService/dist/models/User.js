import mongoose, { Schema } from "mongoose";
;
const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'name is required']
    },
    email: {
        type: String,
        required: [true, 'email is required'],
        unique: true
    }
}, { timestamps: true });
export const User = mongoose.model('User', userSchema);
