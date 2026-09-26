import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'; 
import prisma from "./prismaClient.js";
import dotenv from "dotenv";

dotenv.config();

const passportSetup = () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/api/v1/user/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    console.log("GoogleStrategy initialized ✅");
    try {
      const email = profile.emails && profile.emails[0].value;
      if (!email) {
        return done(new Error("No email found in Google profile"), null);
      }

      let user = await prisma.user.findFirst({ where: { googleId: profile.id } });
      if (user) {
        return done(null, user);
      }

      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user.googleId = profile.id;
        if (!user.firstName && profile.name?.givenName) {
          user.firstName = profile.name.givenName;
        }
        if (!user.lastName && profile.name?.familyName) {
          user.lastName = profile.name.familyName;
        }
        // Only update the photo if it's the default one
        if (user.photo && user.photo.includes('github.com/shadcn') && profile.photos?.length) {
          user.photo = profile.photos[0].value;
        }
        await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.id, firstName: user.firstName, lastName: user.lastName, photo: user.photo } })
        return done(null, user);
      }

      // If no user exists, create a new one with the correct schema fields
      const newUser = await prisma.user.create({ data: {
        googleId: profile.id,
        email: email,
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        photo: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
      } });
      return done(null, newUser);

    } catch (error) {
      console.error(error);
      done(error, null);
    }
  }));
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

export default passportSetup;


