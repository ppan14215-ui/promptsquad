// Test script to check Grok API response structure with search tools
// Run with: XAI_API_KEY=... npx tsx test-grok-search.ts

const XAI_API_KEY = process.env.XAI_API_KEY || 'YOUR_KEY_HERE';

async function testGrokSearch() {
    console.log('🔍 Testing Grok API with search tools...\n');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${XAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'grok-4-1-fast',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'What is the latest news about Tesla today?' }
            ],
            stream: true,
            tools: [
                { type: "function", function: { name: "web_search" } },
                { type: "function", function: { name: "x_search" } }
            ],
            tool_choice: "auto",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('❌ Error:', error);
        return;
    }

    console.log('✅ Response received, processing stream...\n');

    const reader = response.body?.getReader();
    if (!reader) {
        console.error('No reader available');
        return;
    }

    const decoder = new TextDecoder();
    let chunkCount = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') {
                console.log('\n=== DONE ===');
                continue;
            }

            try {
                const parsed = JSON.parse(data);
                chunkCount++;

                console.log(`\n--- Chunk ${chunkCount} ---`);
                console.log('Keys:', Object.keys(parsed));

                if (parsed.choices?.[0]) {
                    const choice = parsed.choices[0];
                    console.log('  finish_reason:', choice.finish_reason);

                    if (choice.delta) {
                        console.log('  delta keys:', Object.keys(choice.delta));
                        if (choice.delta.content) {
                            console.log('  delta.content:', choice.delta.content.substring(0, 100));
                        }
                        if (choice.delta.tool_calls) {
                            console.log('  delta.tool_calls:', JSON.stringify(choice.delta.tool_calls));
                        }
                        if (choice.delta.reasoning_content) {
                            console.log('  delta.reasoning_content:', choice.delta.reasoning_content.substring(0, 100));
                        }
                    }

                    if (choice.message) {
                        console.log('  message keys:', Object.keys(choice.message));
                        if (choice.message.content) {
                            console.log('  message.content:', choice.message.content.substring(0, 100));
                        }
                    }
                }
            } catch (e) {
                console.log('Parse error for:', data.substring(0, 100));
            }
        }
    }

    console.log(`\n\nTotal chunks received: ${chunkCount}`);
}

testGrokSearch().catch(console.error);
