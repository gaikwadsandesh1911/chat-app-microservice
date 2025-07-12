import mongoose from "mongoose";

export const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URL as string);
        console.log("connected successfully to database.")
    } catch (error) {
        console.error("❌database connection failed.");
        throw error  // let index.ts handle it when call this method
    }
};
