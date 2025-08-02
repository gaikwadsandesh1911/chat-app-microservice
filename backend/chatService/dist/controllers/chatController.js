"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewChat = void 0;
const asyncErrorHandler_js_1 = require("../utils/asyncErrorHandler.js");
const CustomError_js_1 = require("../utils/CustomError.js");
const chatSchema_js_1 = require("../models/chatSchema.js");
const createNewChat = (0, asyncErrorHandler_js_1.asyncErrorHandler)(async (req, res, next) => {
    const userId = req.user?.userId; // from isAuth middleware
    const { otherUserId } = req.body;
    if (!otherUserId) {
        return next(new CustomError_js_1.CustomError("otherUserId is required", 400));
    }
    // one-to-one chat
    const existingChat = await chatSchema_js_1.Chat.findOne({
        users: { $all: [userId, otherUserId], $size: 2 }
    });
    if (existingChat) {
        return res.status(200).json({
            success: true,
            message: "Chat already exists",
            chatId: existingChat._id,
        });
    }
    // Create new chat
    const newChat = await chatSchema_js_1.Chat.create({
        users: [userId, otherUserId],
    });
    return res.status(201).json({
        success: true,
        message: "New chat created",
        chatId: newChat._id,
    });
});
exports.createNewChat = createNewChat;
