import User from "../models/userModel.js"


export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const newUser = new User({
      email,
      password,
    });

    await newUser.save();

    res.status(201).json({ status: true, message: "User registered successfully", user: newUser });
  } catch (error) {
    res.status(400).json({ status: false, message: "Server error", error: error.message });
  }
};

// PATCH /api/users/:id
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
      return res.status(404).json({ status: false, message: "User not found" });
    }

    res.json({ status: true, message: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
};





