"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const isAuth_js_1 = require("../middleware/isAuth.js");
const chatController_js_1 = require("../controllers/chatController.js");
router.post("/new", isAuth_js_1.isAuth, chatController_js_1.createNewChat);
exports.default = router;
