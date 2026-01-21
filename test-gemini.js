// Test script to verify Gemini API configuration
// Run with: node test-gemini.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';

async function testGemini() {
    console.log('Testing Gemini API...\n');

    // Test 1: List available models
    console.log('1. Fetching available models...');
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );

        if (!response.ok) {
            console.error('❌ Failed to fetch models:', response.status, response.statusText);
            const error = await response.text();
            console.error('Error details:', error);
            return;
        }

        const data = await response.json();
        console.log('✅ Available models:');
        data.models.forEach(model => {
            if (model.name.includes('gemini')) {
                console.log(`   - ${model.name.replace('models/', '')}`);
            }
        });
        console.log('');
    } catch (error) {
        console.error('❌ Error fetching models:', error.message);
        return;
    }

    // Test 2: Try to generate content with gemini-1.5-flash
    console.log('2. Testing gemini-1.5-flash...');
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: 'Say hello in one word' }]
                    }]
                })
            }
        );

        if (!response.ok) {
            console.error('❌ gemini-1.5-flash failed:', response.status, response.statusText);
            const error = await response.text();
            console.error('Error details:', error);
        } else {
            const data = await response.json();
            console.log('✅ gemini-1.5-flash works!');
            console.log('   Response:', data.candidates[0].content.parts[0].text);
        }
        console.log('');
    } catch (error) {
        console.error('❌ Error testing gemini-1.5-flash:', error.message);
    }

    // Test 3: Try gemini-pro (older stable model)
    console.log('3. Testing gemini-pro...');
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: 'Say hello in one word' }]
                    }]
                })
            }
        );

        if (!response.ok) {
            console.error('❌ gemini-pro failed:', response.status, response.statusText);
            const error = await response.text();
            console.error('Error details:', error);
        } else {
            const data = await response.json();
            console.log('✅ gemini-pro works!');
            console.log('   Response:', data.candidates[0].content.parts[0].text);
        }
    } catch (error) {
        console.error('❌ Error testing gemini-pro:', error.message);
    }
}

testGemini();
