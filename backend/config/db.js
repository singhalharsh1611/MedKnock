import mongoose from "mongoose";
import DoseLog from "../models/doseLogModel.js";
import Schedule from "../models/scheduleModel.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected`);

    // --- Create indexes for faster queries ---
    await DoseLog.collection.createIndex({ userId: 1, timestamp: 1 });
    await DoseLog.collection.createIndex({ scheduleId: 1, status: 1 });
    await Schedule.collection.createIndex({ userId: 1, isActive: 1 });
    console.log("Indexes created successfully");

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // exit process with failure
  }
};

export default connectDB;
