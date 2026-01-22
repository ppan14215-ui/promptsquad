// Load environment variables from .env
require('dotenv').config({ path: '.env' });

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('@supabase/supabase-js');

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!apiKey) console.error("No API KEY found");
if (!supabaseUrl) console.error("No Supabase URL found");

// 1. Check Model Availability
const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
    console.log("Checking Gemini Models...");
    // Try fallback list
    const modelsToCheck = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-flash-002", "gemini-1.5-pro", "gemini-1.5-pro-002", "gemini-pro"];

    for (const modelName of modelsToCheck) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello");
            console.log(`✅ ${modelName} is available.`);
        } catch (error) {
            // Check for 404 specifically
            if (error.message.includes('404')) {
                console.log(`❌ ${modelName} NOT FOUND (404).`);
            } else {
                console.log(`⚠️ ${modelName} error: ${error.message.split('\n')[0]}`);
            }
        }
    }
}

// 2. Check for Duplicate Skills
async function checkSkills() {
    console.log("\nChecking Skills for Mascot 1...");
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { count, error } = await supabase
        .from('mascot_skills')
        .select('*', { count: 'exact', head: true })
        .eq('mascot_id', '1');

    if (error) {
        console.error("Error checking skills:", error);
    } else {
        console.log(`Mascot 1 has ${count} skills (Should be 3).`);
        if (count > 3) {
            console.log("⚠️ DUPLICATES DETECTED! We need to clean the table.");
        }
    }
}

async function run() {
    await checkModels();
    await checkSkills();
}

run();
