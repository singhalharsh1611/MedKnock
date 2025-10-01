
import express from "express";
import { allUser, getUserById, login, register, updateUserProfile } from "../controller/userController.js";

const router = express.Router();

router.post('/register',register);
router.post('/login',login);
router.get('/',allUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUserProfile);

export default router;