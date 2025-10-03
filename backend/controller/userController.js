import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinaryConfig.js";
import validator from "validator";
import nodemailer from "nodemailer";

export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    //checking feilds
    if (!email || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json({ success: false, message: "all feilds required" });
    }

    // checking user already exist
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    //salting and hashing of password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // store user
    const newUser = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );

    // response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { email: newUser.email, token },
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      // Without $set, if you pass req.body directly,
      // MongoDB may try to replace the whole document, which is dangerous.
      { new: true, runValidators: true }
      //new: true makes it return the updated document
      // Adding runValidators: true forces Mongoose to check schema
      // validation rules when updating.
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      status: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    // checking if user exists or not
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    //salting and hashing of password
    const match = await bcrypt.compare(password, user.password);

    //checking password
    if (!match) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || "your_jwt_secret",
            { expiresIn: "1d" }
        );
        // console.log(token);
        //respose
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                email: user.email,
                token
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
}



export const allUser = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const photoUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "MedKnock" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { photo: photoUrl.secure_url },
      { new: true }
    );

    res
      .status(200)
      .json({
        success: true,
        message: "Photo uploaded",
        photo: photoUrl,
        user: updatedUser,
      });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Upload failed", error: err.message });
  }
};
//forgot password mail sender
const otpStore = {};
export const sendMail = async (req, res) => {
  try {
    // get email from body
    const { email } = req.body;

    // Validate input
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Invalid email" });
    }
    // User exist or not
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // generate and store otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    // Send OTP via nodemailer
    // Configure transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: `${process.env.SENDER_GMAIL}`,
        pass: `${process.env.SENDER_PASS}`, // Use App Password
      },
    });

    // Mail options
    const mailOptions = {
      from: `<${process.env.SENDER_GMAIL}>`,
      to: `${email}`,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}`,
      html: `<h3>ThankYou for Visiting MedKnock <br> Your OTP is: <strong>${otp}</strong></h3>`,
    };

    // Send mail
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sented:", info.messageId);
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, message: "Email failed", error });
  }
};

// update password
export const updatePassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    // Validate input
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Invalid email" });
    }
    if (password.length < 8) {
      return res.json({ success: false, message: "Weak password" });
    }

    const stored = otpStore[email];
    // console.log(stored,otp)
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;
    await user.save();
    console.log("password update");
    delete otpStore[email]; // clean up used OTP

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({ success: true, message: "Password updated", token });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, message: "Email failed", error });
  }
};
