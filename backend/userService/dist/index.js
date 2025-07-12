import express from "express";
import { globalErrorHandler } from "./utils/globalErrorHandler.js";
import { connectDB } from "./config/dbConnections.js";
import { CustomError } from "./utils/CustomError.js";
import path from 'path';
import { fileURLToPath } from 'url';
// Re-create __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json({
// limit: '100kb'
}));
app.get("/", (req, res, next) => {
    res.send("hello world");
});
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
        server = app.listen(port, () => {
            console.log(`Application is running on http://localhost:${port}`);
        });
    }
    catch (error) {
        console.log("server is not started due to database connection failure.");
        process.exit(1);
    }
};
startServer();
