
// import "jsr:@supabase/functions-js/edge-runtime.d.ts"; // Removed for Node compatibility

const XAI_API_KEY = process.env.XAI_API_KEY || process.env.Grok_API_Key;

async function testGrokTools() {
    if (!XAI_API_KEY) {
        console.error("No API Key found!");
        return;
    }

    console.log("Testing Grok with web_search and x_search tools...");

    // Define tools according to standard OpenAI function calling format, 
    // which xAI aligns with.
    const tools = [
        {
            type: "function",
            function: {
                name: "web_search",
                description: "Search the web for general information and facts.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query" }
                    },
                    required: ["query"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "x_search",
                description: "Search X (formerly Twitter) for real-time social posts, news, and sentiment.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query for X posts" }
                    },
                    required: ["query"]
                }
            }
        }
    ];

    const payload = {
        model: "grok-4.1-fast-reasoning", // Latest reasoning model as of 2026
        messages: [
            { role: "system", content: "You are a helpful assistant. Use x_search to find the latest sentiment on Tesla." },
            { role: "user", content: "What are people on X saying about Tesla stock right now?" }
        ],
        tools: tools,
        stream: false // easier to debug non-streamed first
    };

    try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${XAI_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("API Error:", await response.text());
        } else {
            const data = await response.json();
            console.log("Success! Response:", JSON.stringify(data, null, 2));

            // Check if tool was called
            const toolCalls = data.choices[0]?.message?.tool_calls;
            if (toolCalls) {
                console.log("Tool Calls:", JSON.stringify(toolCalls, null, 2));
            } else {
                console.log("No tool calls triggered.");
            }
        }
    } catch (e) {
        console.error("Request Failed:", e);
    }
}

testGrokTools();
