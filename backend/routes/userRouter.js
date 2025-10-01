
import express from "express";
import { allUser, login, register } from "../controller/userController.js";

const router = express.Router();

router.post('/register',register);
router.post('/login',login);
router.get('/',allUser);



// Auth with Google
authRouter.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

authRouter.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/'
}), (req, res) => {
    if (req.user) {
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Redirect with token in query param
        res.redirect(`${process.env.FRONTEND_URL}/google-success?token=${token}`);
    } else {
        res.redirect(`${process.env.FRONTEND_URL}/login`);
    }
});



export default router;

