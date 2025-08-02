"use strict";
/*
S07TKnb7WC6WHi7J
mongodb+srv://gaikwadsandesh1911:S07TKnb7WC6WHi7J@cluster0.ebacnsx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
dbname is written after => .net?<dbname>?

we write dbname here in connect method.

    await mongoose.connect("uri", {
        dbName: ""
    })


*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URL, {
            dbName: process.env.MONGO_DB_NAME,
        });
        console.log("✅ MongoDB connected successfully.");
    }
    catch (error) {
        console.error("❌ MongoDB connection failed.");
        throw error; // let index.ts handle it when call this method
    }
};
exports.connectDB = connectDB;
const closeDB = async () => {
    try {
        if (mongoose_1.default.connection.readyState !== 0) {
            await mongoose_1.default.connection.close();
            console.log("🛑 MongoDB connection closed.");
        }
    }
    catch (err) {
        console.error("❌ Failed to close MongoDB connection:", err);
    }
};
exports.closeDB = closeDB;
