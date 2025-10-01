import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import User from "../models/usersModel.js";
import dotenv from "dotenv";

dotenv.config();


const passportSetup = () => {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Extract email safely
            const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

            if (!email) {
                return done(new Error("No email found in Google profile"), null);
            }

            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                return done(null, user);
            }

            user = await User.findOne({ email });

            if (user) {
                user.googleId = profile.id;
                user.name = profile.displayName;
                user.profilePicture = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : user.profilePicture;

                await user.save();
                return done(null, user);
            }

            const newUser = new User({
                name: profile.displayName,
                email: email,
                googleId: profile.id,
                profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined
            });
            await newUser.save();

            done(null, newUser);

        } catch (error) {
            console.error(error);
            done(error, null);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        User.findById(id)
            .then((user) => done(null, user))
            .catch(err => done(err, null));
    });
};

export default passportSetup;