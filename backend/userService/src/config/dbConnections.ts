import mongoose from "mongoose";

export const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URL as string);
        console.log("✅ MongoDB connected successfully.")
    } catch (error) {
        console.error("❌ MongoDB connection failed.");
        throw error  // let index.ts handle it when call this method
    }
};
