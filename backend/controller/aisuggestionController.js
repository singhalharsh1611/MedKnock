import { AISuggestionService } from "../services/aiSuggestionService.js";

export const getAISuggestions = async (req, res) => {
  try {
    const suggestions = await AISuggestionService.getAISuggestions(req.user.id, req.query);
    res.json({ suggestions });
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    res.status(500).json({ error: "Failed to generate AI suggestions" });
  }
};
