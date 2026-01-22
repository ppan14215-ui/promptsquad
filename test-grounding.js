// Test if Gemini API supports grounding (Google Search)
require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API KEY found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testGrounding() {
    console.log("Testing Gemini Grounding Support...\n");

    // Test 1: Try gemini-2.5-flash with grounding
    console.log("Test 1: gemini-2.5-flash with grounding tools");
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [{ googleSearchRetrieval: {} }],
        });

        const result = await model.generateContent("What is the current weather in Paris?");
        const response = await result.response;
        console.log("✅ SUCCESS - Grounding works with gemini-2.5-flash");
        console.log("Response snippet:", response.text().substring(0, 100) + "...\n");
    } catch (error) {
        if (error.message.includes('404')) {
            console.log("❌ FAILED - Model not found (404)");
        } else if (error.message.includes('not supported')) {
            console.log("❌ FAILED - Grounding not supported for this model");
        } else {
            console.log("❌ FAILED - Error:", error.message.split('\n')[0]);
        }
        console.log();
    }

    // Test 2: Try gemini-2.5-pro with grounding
    console.log("Test 2: gemini-2.5-pro with grounding tools");
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-pro",
            tools: [{ googleSearchRetrieval: {} }],
        });

        const result = await model.generateContent("What is the current weather in Paris?");
        const response = await result.response;
        console.log("✅ SUCCESS - Grounding works with gemini-2.5-pro");
        console.log("Response snippet:", response.text().substring(0, 100) + "...\n");
    } catch (error) {
        if (error.message.includes('404')) {
            console.log("❌ FAILED - Model not found (404)");
        } else if (error.message.includes('not supported')) {
            console.log("❌ FAILED - Grounding not supported for this model");
        } else {
            console.log("❌ FAILED - Error:", error.message.split('\n')[0]);
        }
        console.log();
    }

    // Test 3: Baseline - gemini-2.5-flash WITHOUT grounding (should always work)
    console.log("Test 3: gemini-2.5-flash WITHOUT grounding (baseline)");
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const result = await model.generateContent("Say hello");
        const response = await result.response;
        console.log("✅ SUCCESS - Basic model works");
        console.log("Response:", response.text() + "\n");
    } catch (error) {
        console.log("❌ FAILED - Even basic model doesn't work:", error.message.split('\n')[0]);
        console.log();
    }
}

testGrounding().catch(console.error);
