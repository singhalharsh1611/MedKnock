import fetch from "node-fetch";

/**
 * Reusable function to call the Ollama API
 * @param {Array} parts - The parts of the request, e.g., [{ text: prompt }, { inline_data: { mime_type, data } }]
 * @returns {Promise<string>} - The text response from the LLM
 */
export const callLLM = async (parts) => {
    let contentText = "";
    let images = [];

    parts.forEach(part => {
        if (part.text) contentText += part.text + "\n";
        if (part.inline_data && part.inline_data.data) {
            images.push(part.inline_data.data);
        }
    });

    const url = "https://ollama.com/api/chat";
    const bodyPayload = {
        model: process.env.OLLAMA_MODEL || "gemma4:31b",
        messages: [
            {
                role: "user",
                content: contentText.trim(),
            }
        ],
        stream: false
    };

    if (images.length > 0) {
        bodyPayload.messages[0].images = images;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OLLAMA_API_KEY}`
        },
        body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data?.message?.content || "";
};
