import User from "../models/userModel.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinaryConfig.js";


export const register = async (req, res) => {
    try {

        const { email, password, firstName, lastName } = req.body;

        //checking feilds
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ success: false, message: "all feilds required" });
        }

        // checking user already exist
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        //salting and hashing of password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // store user
        const newUser = new User({
            email,
            password: hashedPassword,
            firstName,
            lastName
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
        res.status(400).json({ success: false, message: "Server error", error: error.message });
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
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ status: true, message: "Profile updated successfully", user: updatedUser });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        // checking if user exists or not
        if (!user) return res.status(404).json({ success: false, message: "User not found" });


        //salting and hashing of password
        const match = await bcrypt.compare(password, user.password);

        //checking password
        if (!match) { 
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }


        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET ,
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
}


export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const photoUrl = await new Promise((resolve, reject)=>{
            const stream = cloudinary.uploader.upload_stream(
                {folder:"MedKnock"}, 
                (error, result) => {
                    if(error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file.buffer);
        })
        const userId = req.user.id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { photo: photoUrl.secure_url },
            { new: true }
        );

        res.status(200).json({ success: true, message: 'Photo uploaded', photo: photoUrl, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
    }
};