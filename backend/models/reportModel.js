import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    cloudinaryUrl: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
        default: "",
    },
    analyzed: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Report = mongoose.model("Report", reportSchema);

export default Report;