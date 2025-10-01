import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },

  //Profile Info
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    min: 0
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"]
  },
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please use a valid phone number.'] // E.164 format
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String }
  },

  //Health-related
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  },
  allergies: {
    type: [String], // e.g. ["penicillin", "peanuts"]
    default: []
  },
  medicalConditions: {
    type: [String], // e.g. ["diabetes", "hypertension"]
    default: []
  },
  emergencyContact: {
    name: { type: String },
    phone: { type: String }
  },

  //Push Notifications
  pushSubscription: {
    type: Object
  },

  //App-related
  role: {
    type: String,
    enum: ["user", "admin", "doctor"],
    default: "user"
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
