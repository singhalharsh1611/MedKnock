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

/**
 * Reusable function to stream from the Ollama API
 * @param {Array} parts - The parts of the request
 * @param {Function} onChunk - Callback executed for each chunk of text
 */
export const streamLLM = async (parts, onChunk) => {
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
        stream: true
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

    if (response.body) {
        let buffer = "";
        for await (const chunk of response.body) {
            buffer += chunk.toString();
            let boundary = buffer.indexOf('\n');
            
            while (boundary !== -1) {
                const line = buffer.slice(0, boundary).trim();
                buffer = buffer.slice(boundary + 1);
                
                if (line) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message?.content) {
                            onChunk(parsed.message.content);
                        }
                    } catch (e) {
                        // ignore broken json
                    }
                }
                boundary = buffer.indexOf('\n');
            }
        }
    }
};
