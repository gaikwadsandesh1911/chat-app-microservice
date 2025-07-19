import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { consumeOtpQueue } from './consumer/consumeMail.js';
const app = express();
const port = process.env.PORT || 5002;
let server;
app.use(express.json());
const startServer = async () => {
    try {
        await consumeOtpQueue();
        server = app.listen(port, () => {
            console.log(`Mail service is running on http://localhost:${port}`);
        });
    }
    catch (error) {
        console.log(`Mail Server is failed to start.`);
        process.exit(1);
    }
};
startServer();
// -----------------------------------------------------------------------------------------------------
