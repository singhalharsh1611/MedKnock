import prisma from "../config/prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinaryConfig.js";
import { sendEmail } from "../utils/emailClient.js";

// In-memory store for OTPs (Could be moved to Redis in the future)
const otpStore = {};

export class UserService {
  static async registerUser({ email, password, firstName, lastName }) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    const token = this.generateToken(newUser.id);
    return { user: newUser, token };
  }

  static async loginUser({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    const token = this.generateToken(user.id);
    return { user, token };
  }

  static async updateUserProfile(id, data) {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });
    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }

  static async getAllUsers() {
    return await prisma.user.findMany();
  }

  static async getUserById(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");
    return user;
  }

  static async uploadProfilePhoto(userId, fileBuffer) {
    const photoUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "MedKnock" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(fileBuffer);
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { photo: photoUrl.secure_url },
    });
    return { photoUrl, updatedUser };
  }

  static async sendVerificationOTP(email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error("User already exists");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    await sendEmail(
      email,
      "Verify Your Email for MedKnock Registration",
      `<h3>Welcome to MedKnock!<br>Your verification OTP is: <strong>${otp}</strong></h3>`
    );
  }

  static async verifyEmailOTP(email, otp) {
    const stored = otpStore[email];
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      throw new Error("Invalid or expired OTP");
    }
    delete otpStore[email];
    return true;
  }

  static async sendPasswordResetOTP(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    await sendEmail(
      email,
      "Your OTP Code for MedKnock",
      `<h3>Thank you for visiting MedKnock.<br>Your OTP is: <strong>${otp}</strong></h3>`
    );
  }

  static async updatePassword(email, password, otp) {
    const stored = otpStore[email];
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      throw new Error("Invalid or expired OTP");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    delete otpStore[email];
    const token = this.generateToken(user.id);
    return token;
  }

  static generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );
  }
}
