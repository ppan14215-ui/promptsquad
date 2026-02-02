// Test script to discover available Claude models
// Run with: npx ts-node supabase/functions/chat-dev/test-claude-models.ts

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_KEY_HERE';

async function testClaudeModels() {
    console.log('🔍 Testing Claude API...\n');

    // Models to test - we'll try each one
    const modelsToTest = [
        // Latest aliases
        'claude-3-5-sonnet-latest',
        'claude-3-5-haiku-latest',
        'claude-3-opus-latest',
        'claude-3-sonnet-latest',
        'claude-3-haiku-latest',

        // Dated versions (2024)
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',

        // Older dated versions
        'claude-3-5-sonnet-20240620',

        // Claude 2 legacy
        'claude-2.1',
        'claude-2.0',
        'claude-instant-1.2',
    ];

    const results: { model: string; status: string; error?: string }[] = [];

    for (const model of modelsToTest) {
        console.log(`Testing: ${model}...`);

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hi' }],
                }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`  ✅ ${model} - WORKS!`);
                results.push({ model, status: '✅ WORKS' });
            } else if (data.error?.type === 'not_found_error') {
                console.log(`  ❌ ${model} - Not found`);
                results.push({ model, status: '❌ Not found', error: data.error.message });
            } else {
                console.log(`  ⚠️ ${model} - Other error: ${data.error?.message || JSON.stringify(data)}`);
                results.push({ model, status: '⚠️ Other error', error: data.error?.message });
            }
        } catch (e: any) {
            console.log(`  💥 ${model} - Network error: ${e.message}`);
            results.push({ model, status: '💥 Network error', error: e.message });
        }
    }

    console.log('\n\n📋 SUMMARY:');
    console.log('='.repeat(60));

    const working = results.filter(r => r.status.includes('WORKS'));
    const notFound = results.filter(r => r.status.includes('Not found'));
    const other = results.filter(r => !r.status.includes('WORKS') && !r.status.includes('Not found'));

    console.log('\n✅ WORKING MODELS:');
    working.forEach(r => console.log(`  - ${r.model}`));

    if (working.length === 0) {
        console.log('  (none found - check your API key!)');
    }

    console.log('\n❌ NOT FOUND:');
    notFound.forEach(r => console.log(`  - ${r.model}`));

    if (other.length > 0) {
        console.log('\n⚠️ OTHER ERRORS:');
        other.forEach(r => console.log(`  - ${r.model}: ${r.error}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Use one of the WORKING models in your code!');
}

testClaudeModels().catch(console.error);
