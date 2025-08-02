"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const dbConnection_js_1 = require("./config/dbConnection.js");
const globalErrorHandler_js_1 = require("./utils/globalErrorHandler.js");
const CustomError_js_1 = require("./utils/CustomError.js");
const chatRoutes_js_1 = __importDefault(require("./routes/chatRoutes.js"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api/v1/chat", chatRoutes_js_1.default);
// default route if no route finds
app.use((req, res, next) => {
    return next(new CustomError_js_1.CustomError(`Can't find ${req.originalUrl} on this server`, 400));
});
// global error handling middleware
app.use(globalErrorHandler_js_1.globalErrorHandler);
const port = process.env.PORT || 5003;
let server;
const startServer = async () => {
    try {
        await (0, dbConnection_js_1.connectDB)();
        server = app.listen(port, () => {
            console.log(`🚀 Chat service is running on http://localhost:${port}`);
        });
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
};
startServer();
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
        await (0, dbConnection_js_1.closeDB)();
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
// when a Promise is rejected and there’s no .catch() handler or tryCatch
process.on('unhandledRejection', (err) => {
    console.log('unhandledRejection error => ', err);
    gracefullyShutDown('UNHANDLED-REJECTION');
});
// uncaughtException handles synchronous errors not caught by try/catch
process.on('uncaughtException', (err) => {
    console.log('uncaughtException error => ', err);
    gracefullyShutDown('UNCAUGHT-Exception');
});
