import express from "express";
import { allUser, getUserById, login, register, sendMail, updatePassword, updateUserProfile, uploadProfilePhoto } from "../controller/userController.js";
import multer from "multer";
import protect from "../middlewares/authMiddleware.js";
import passport from "passport";
import jwt from 'jsonwebtoken';
import {
  connectGoogleCalendar,
  googleCalendarCallback,
  disconnectGoogleCalendar,
} from "../controller/googleCalendarController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


//calender
router.get("/google-calendar", connectGoogleCalendar);
router.get("/google-calendar/callback", googleCalendarCallback);
router.post("/google-calendar/disconnect", protect, disconnectGoogleCalendar);

// Auth with Google
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}`
}), (req, res) => {
    if (req.user) {
        const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Redirect with token in query param
        res.redirect(`${process.env.FRONTEND_URL}/google-success?token=${token}`);
    } else {
        res.redirect(`${process.env.FRONTEND_URL}/login`);
    }
});

router.post('/register',register);
router.post('/login',login);
router.get('/',allUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUserProfile);
router.patch('/:id/photo', protect, upload.single('file'), uploadProfilePhoto);
router.post('/forgot-password', sendMail);
router.post('/update-password', updatePassword);

export default router;