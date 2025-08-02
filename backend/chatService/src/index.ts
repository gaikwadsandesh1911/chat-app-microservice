import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { connectDB, closeDB } from './config/dbConnection.js';
import { globalErrorHandler } from './utils/globalErrorHandler.js';
import { CustomError } from './utils/CustomError.js';
import chatRoutes from './routes/chatRoutes.js';

const app = express();

app.use(express.json());

app.use("/api/v1/chat", chatRoutes);


// default route if no route finds
app.use((req, res, next)=>{
  return next(new CustomError(`Can't find ${req.originalUrl} on this server`, 400));
});

// global error handling middleware
app.use(globalErrorHandler)

const port = process.env.PORT || 5003;
let server: any;

const startServer = async() => {
    try {
        await connectDB();
        server = app.listen(port, () => {
            console.log(`🚀 Chat service is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};
startServer();

const gracefullyShutDown = async (signal: any) => {
  console.log(`🛑 ${signal} received. Gracefully shutting down..`);
  try {
      // close server first
      if(server){
        /*  server.close() is callback-based, not Promise-based.
            It won’t wait for the server to finish closing. The function will move to the next line
            Wrapping with new Promise makes it awaitable:
        */
        await new Promise<void>((resolve, reject) => {
          server.close((err: any) => {
            if(err) return reject(err);
            resolve();
          })
        })
      }
      console.log('🛑 Express server closed.');
      //  and then close all other services
      await closeDB();

      console.log('✅ All services shut down cleanly.');
      process.exit(0);

  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

// SIGINT stands for Signal Interrupt.  when you press Ctrl + C in the terminal.
process.on("SIGINT", () => gracefullyShutDown("SIGINT"));

// SIGTERM stands for Signal Terminate. typically comes from (os, docker, aws, kubernates)
process.on('SIGTERM', () => gracefullyShutDown('SIGTERM'));

// when a Promise is rejected and there’s no .catch() handler or tryCatch
process.on('unhandledRejection', (err) => {
  console.log('unhandledRejection error => ', err)
  gracefullyShutDown('UNHANDLED-REJECTION');
});

// uncaughtException handles synchronous errors not caught by try/catch
process.on('uncaughtException', (err) => {
  console.log('uncaughtException error => ', err)
  gracefullyShutDown('UNCAUGHT-Exception');
});