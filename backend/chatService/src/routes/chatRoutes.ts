import express from 'express';
const router = express.Router();
import { isAuth } from '../middleware/isAuth.js';
import { createNewChat } from '../controllers/chatController.js';

router.post("/new", isAuth, createNewChat);

export default router;