import express from "express";
import { allUser, getUserById, login, register, sendMail, updatePassword, updateUserProfile, uploadProfilePhoto } from "../controller/userController.js";
import multer from "multer";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/register',register);
router.post('/login',login);
router.get('/',allUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUserProfile);
router.patch('/:id/photo', protect, upload.single('file'), uploadProfilePhoto);
router.post('/forgot-password', sendMail);
router.post('/update-password', updatePassword);
export default router;