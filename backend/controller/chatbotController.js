import { ChatbotService } from "../services/chatbotService.js";

export const handleChat = async (req, res) => {
  try {
    const { question, history } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized Access" });

    const answer = await ChatbotService.getChatbotResponse(userId, question, history);
    return res.status(200).json({ answer });

  } catch (err) {
    if (err.message === "Question is required.") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Chatbot controller error:", err);
    res.status(500).json({ message: "Failed to get a response from MedKnock." });
  }
};
