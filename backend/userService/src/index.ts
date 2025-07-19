import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { globalErrorHandler } from "./utils/globalErrorHandler.js";
import { connectDB } from "./config/dbConnections.js";
import { CustomError } from "./utils/CustomError.js";
import { connectRedis } from "./config/redisConnection.js";
import path from 'path';
import { fileURLToPath } from 'url';
// Re-create __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import userRoutes from './routes/userRoutes.js';

import {closeRabbitMQ, connectRabbitMQ} from "./config/rabbitmqConnection.js";

const app = express();

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.json({
  // limit: '100kb'
}));

app.use("/api/v1/user", userRoutes);

// default route. if no route matches
app.use((req, res, next)=>{
  return next(new CustomError(`Can't find ${req.originalUrl} on this server`, 400));
});

app.use(globalErrorHandler);

const port = process.env.PORT || 5001;

let server;

const startServer = async () => {
  try {

    await connectDB();

    await connectRedis();

    await connectRabbitMQ();

    server = app.listen(port, () => {
      console.log(`🚀 User service is running on http://localhost:${port}`);
    });

  } catch (error) {
    console.log("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();

// -----------------------------------------------------------------------------------------

process.on('SIGINT', async () => {
  await closeRabbitMQ();
  process.exit(0);
});


