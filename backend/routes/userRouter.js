
import express from "express";
import { allUser, login, register } from "../controller/userController.js";

const router = express.Router();

router.post('/register',register);
router.post('/login',login);
router.get('/',allUser);



export default router;

