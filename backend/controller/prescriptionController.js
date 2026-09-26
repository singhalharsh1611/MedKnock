import { PrescriptionService } from "../services/prescriptionService.js";

export const analyzePrescription = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not authenticated." });
    }

    const [cloudinaryUrl, medicineData] = await Promise.all([
      PrescriptionService.uploadToCloudinary(req.file.buffer),
      PrescriptionService.analyzePrescriptionImage(req.file.buffer, req.file.mimetype)
    ]);

    res.status(200).json({
      success: true,
      message: "Prescription analyzed successfully.",
      data: medicineData,
      cloudinaryUrl: cloudinaryUrl,
    });
  } catch (err) {
    res.status(err.message === "Invalid prescription" ? 400 : 500).json({
      success: false,
      message: err.message || "An internal server error occurred.",
    });
  }
};
