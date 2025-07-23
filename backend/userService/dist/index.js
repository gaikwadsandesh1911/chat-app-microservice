import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { globalErrorHandler } from "./utils/globalErrorHandler.js";
import { connectDB, closeDB } from "./config/dbConnections.js";
import { CustomError } from "./utils/CustomError.js";
import { closeRedis, connectRedis } from "./config/redisConnection.js";
import path from 'path';
import { fileURLToPath } from 'url';
// Re-create __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import userRoutes from './routes/userRoutes.js';
import { closeRabbitMQ, connectRabbitMQ } from "./config/rabbitmqConnection.js";
const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json({
// limit: '100kb'
}));
app.use("/api/v1/user", userRoutes);
// default route. if no route matches
app.use((req, res, next) => {
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
    }
    catch (error) {
        console.log("❌ User Server failed to start:", error);
        process.exit(1);
    }
};
startServer();
// -----------------------------------------------------------------------------------------
// gracefully shut down
const gracefullyShutDown = async (signal) => {
    console.log(`🛑 ${signal} received. Gracefully shutting down..`);
    try {
        // close server first
        if (server) {
            /*  server.close() is callback-based, not Promise-based.
                It won’t wait for the server to finish closing. The function will move to the next line
                Wrapping with new Promise makes it awaitable:
            */
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err)
                        return reject(err);
                    resolve();
                });
            });
        }
        console.log('🛑 Express server closed.');
        //  and then close all other services
        await closeDB();
        await closeRedis();
        await closeRabbitMQ();
        console.log('✅ All services shut down cleanly.');
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
};
// SIGINT stands for Signal Interrupt.  when you press Ctrl + C in the terminal.
process.on("SIGINT", () => gracefullyShutDown("SIGINT"));
// SIGTERM stands for Signal Terminate. typically comes from (os, docker, aws, kubernates)
process.on('SIGTERM', () => gracefullyShutDown('SIGTERM'));
// process.exit(0); =>  immediately terminate the process, 0 == success, 1 == error
/*  process.exit() immediately stops the event loop
    Any async code after it will be ignored
    Always make sure to await cleanup tasks before calling it
*/
// when a Promise is rejected and there’s no .catch() handler or tryCatch
/* process.on('unhandledRejection', (err) => {
  console.log('unhandledRejection error => ', err)
  gracefullyShutDown('UNHANDLED-REJECTION');
});

// uncaughtException handles synchronous errors not caught by try/catch
process.on('uncaughtException', (err) => {
  console.log('uncaughtException error => ', err)
  gracefullyShutDown('UNCAUGHT-Exception');
}); */
