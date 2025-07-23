import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { consumeOTP, retryFromDLQ} from './queue/consumeOTP.js';
import { closeRedis, connectRedis } from './config/connectRedis.js';
import { connectRabbitMQ } from './config/connectRabbitMQ.js';
import { closeRabbitMQ } from './config/connectRabbitMQ.js';
const app = express();

const port = process.env.PORT || 5002;
let server: any;

app.use(express.json());

const startServer = async() => {
    try {
        await connectRabbitMQ();
        await connectRedis();
        await consumeOTP();
        await retryFromDLQ();
        server = app.listen(port, () => {
            console.log(`🚀 Mail service is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.log(`❌ Mail Server is failed to start.`, error);
        process.exit(1);
    }
}
startServer();

// -----------------------------------------------------------------------------------------------------

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
    
      await closeRedis();
      await closeRabbitMQ();

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

