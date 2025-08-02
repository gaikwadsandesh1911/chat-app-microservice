/* 
S07TKnb7WC6WHi7J
mongodb+srv://gaikwadsandesh1911:S07TKnb7WC6WHi7J@cluster0.ebacnsx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
dbname is written after => .net?<dbname>?

we write dbname here in connect method.

    await mongoose.connect("uri", {
        dbName: ""
    })


*/

import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL as string, {
      dbName: process.env.MONGO_DB_NAME,
    });
    console.log("✅ MongoDB connected successfully.");
  } catch (error) {
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
  } catch (err) {
    console.error("❌ Failed to close MongoDB connection:", err);
  }
};
