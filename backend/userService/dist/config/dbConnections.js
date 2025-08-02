import mongoose from "mongoose";
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            dbName: process.env.MONGO_DB_NAME
        });
        console.log("✅ MongoDB connected successfully.");
    }
    catch (error) {
        console.error("❌ MongoDB connection failed.");
        throw error; // let index.ts handle it when call this method
    }
};
export const closeDB = async () => {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log("🛑 MongoDB connection closed.");
        }
    }
    catch (err) {
        console.error("❌ Failed to close MongoDB connection:", err);
    }
};
