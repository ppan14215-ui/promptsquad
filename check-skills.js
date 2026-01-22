const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSkills() {
    console.log('Checking mascot_skills table...');
    const { data, error, count } = await supabase
        .from('mascot_skills')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error querying mascot_skills:', error);
    } else {
        console.log(`Found ${count} skills.`);
        if (data && data.length > 0) {
            console.log('Sample skill:', data[0]);
        } else {
            console.log('No skills found!');
        }
    }
}

checkSkills();
