import { NextFunction, Response } from "express";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { AuthRequest } from "../middleware/isAuth.js";
import { CustomError } from "../utils/CustomError.js";
import { Chat } from "../models/chatSchema.js";

const createNewChat = asyncErrorHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    
    const userId = req.user?.userId; // from isAuth middleware

    const { otherUserId } = req.body;

    if(!otherUserId) {
        return next(new CustomError("otherUserId is required", 400));
    }

    // one-to-one chat
    const existingChat = await Chat.findOne({
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
    const newChat = await Chat.create({
      users: [userId, otherUserId],
    });

    return res.status(201).json({
      success: true,
      message: "New chat created",
      chatId: newChat._id,
    });

});

export { createNewChat };