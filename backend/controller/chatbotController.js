import { ChatbotService } from "../services/chatbotService.js";

export const handleChat = async (req, res) => {
  try {
    const { question, history } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized Access" });
    if (!question) return res.status(400).json({ message: "Question is required." });

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Tell the client to expect an ongoing stream

    await ChatbotService.getChatbotResponseStream(userId, question, history, (chunk) => {
      // Send chunk in SSE format
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    // End the stream when done
    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    console.error("Chatbot controller error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to get a response from MedKnock." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Failed to process response" })}\n\n`);
      res.end();
    }
  }
};
