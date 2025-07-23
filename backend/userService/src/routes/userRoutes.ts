import express from 'express';
import { getOtpStatusByOtpTrackingId, loginUser } from '../controllers/userController.js';

const router = express.Router();

router.post('/login', loginUser);
router.get('/otp-status/:otpTrackingId', getOtpStatusByOtpTrackingId);

export default router;