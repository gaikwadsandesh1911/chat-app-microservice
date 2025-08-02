"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const asyncErrorHandler_js_1 = require("../utils/asyncErrorHandler.js");
const CustomError_js_1 = require("../utils/CustomError.js");
exports.isAuth = (0, asyncErrorHandler_js_1.asyncErrorHandler)(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer'))
        return next(new CustomError_js_1.CustomError("Authorization header missing or malformed. Please, Login again !", 401));
    const token = authHeader.split(" ")[1];
    const decodeToken = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    console.log({ decodeToken });
    if (decodeToken != null) {
        req.user = decodeToken;
        return next();
    }
    return next(new CustomError_js_1.CustomError("Invalid Token Payload", 401));
});
