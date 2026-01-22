const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple UUID generator
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const rawSkills = [
    // Analyst Bear (1)
    { id: '1-1', mascot_id: '1', skill_label: 'Stock analysis', skill_prompt: 'Perform a detailed stock analysis considering technical and fundamental indicators.' },
    { id: '1-2', mascot_id: '1', skill_label: 'Competitive analysis', skill_prompt: 'Analyze the competitive landscape for [Industry/Company], identifying key competitors, their strengths, weaknesses, and market share.' },
    { id: '1-3', mascot_id: '1', skill_label: 'Market analysis', skill_prompt: 'Conduct a comprehensive market analysis for [Market/Industry], including trends, growth drivers, and potential risks.' },

    // Writer Fox (2)
    { id: '2-1', mascot_id: '2', skill_label: 'Blog posts', skill_prompt: 'Write an engaging blog post about [Topic], approx [Word Count] words, targeting [Audience].' },
    { id: '2-2', mascot_id: '2', skill_label: 'Email drafts', skill_prompt: 'Draft a professional email to [Recipient] regarding [Subject], with a tone of [Tone].' },
    { id: '2-3', mascot_id: '2', skill_label: 'Social media', skill_prompt: 'Create a series of social media posts for [Platform] about [Topic], including hashtags.' },

    // UX Panda (3)
    { id: '3-1', mascot_id: '3', skill_label: 'User research', skill_prompt: 'Plan a user research study to understand [User Goal/Problem], including methodologies and key questions.' },
    { id: '3-2', mascot_id: '3', skill_label: 'Wireframing', skill_prompt: 'Describe the wireframe layout for a [Screen/Feature], detailing the placement of key elements and navigation.' },
    { id: '3-3', mascot_id: '3', skill_label: 'Usability testing', skill_prompt: 'Design a usability test script for [Product/Feature] to evaluate [Metric/Flow].' },

    // Advice Zebra (4)
    { id: '4-1', mascot_id: '4', skill_label: 'Life coaching', skill_prompt: 'Act as a life coach and help me work through [Issue/Goal], providing actionable advice and perspective.' },
    { id: '4-2', mascot_id: '4', skill_label: 'Decision making', skill_prompt: 'Help me make a decision about [Choice A vs Choice B] by analyzing the pros, cons, and long-term implications.' },
    { id: '4-3', mascot_id: '4', skill_label: 'Problem solving', skill_prompt: 'Help me solve the problem of [Problem Description] by breaking it down into manageable steps.' },

    // Premium Mascots
    // Teacher Owl (5)
    { id: '5-1', mascot_id: '5', skill_label: 'Lesson planning', skill_prompt: 'Create a lesson plan for [Subject] on the topic of [Topic] for [Grade Level], including objectives and activities.' },
    { id: '5-2', mascot_id: '5', skill_label: 'Homework help', skill_prompt: 'Explain the concept of [Concept] in a simple, easy-to-understand way, as if explaining to a student.' },
    { id: '5-3', mascot_id: '5', skill_label: 'Concept explanation', skill_prompt: 'Provide a clear and concise explanation of [Complex Term/Idea] with examples.' },

    // Prompt Turtle (6)
    { id: '6-1', mascot_id: '6', skill_label: 'Prompt engineering', skill_prompt: 'Optimize the following prompt to get better results from an AI model: [Insert Prompt].' },
    { id: '6-2', mascot_id: '6', skill_label: 'AI optimization', skill_prompt: 'Suggest ways to optimize [Workflow/Process] using AI tools and automation.' },
    { id: '6-3', mascot_id: '6', skill_label: 'Workflow automation', skill_prompt: 'Outline a workflow automation strategy for [Task/Process] to increase efficiency.' },

    // Data Badger (7)
    { id: '7-1', mascot_id: '7', skill_label: 'Data visualization', skill_prompt: 'Suggest the best way to visualize [Data Type/Set] to highlight [Key Insight].' },
    { id: '7-2', mascot_id: '7', skill_label: 'Statistical analysis', skill_prompt: 'Explain the statistical significance of [Result/Observation] and what test should be used.' },
    { id: '7-3', mascot_id: '7', skill_label: 'Report generation', skill_prompt: 'Structure a data report for [Stakeholder] analyzing [Metrics/KPIs].' },

    // Quick Mouse (8)
    { id: '8-1', mascot_id: '8', skill_label: 'Quick fixes', skill_prompt: 'Provide a quick solution or workaround for the error/issue: [Error Message/Issue].' },
    { id: '8-2', mascot_id: '8', skill_label: 'Troubleshooting', skill_prompt: 'Walk me through the troubleshooting steps for [Device/Software Problem].' },
    { id: '8-3', mascot_id: '8', skill_label: 'Time management', skill_prompt: 'Suggest quick time management tips to efficiently handle [Task/Project].' },

    // Creative Pig (9)
    { id: '9-1', mascot_id: '9', skill_label: 'Brainstorming', skill_prompt: 'Brainstorm 10 creative ideas for [Project/Theme].' },
    { id: '9-2', mascot_id: '9', skill_label: 'Ideation', skill_prompt: 'Generate innovative concepts for a new [Product/Service].' },
    { id: '9-3', mascot_id: '9', skill_label: 'Creative writing', skill_prompt: 'Write a short creative piece involving [Characters/Setting] with a theme of [Theme].' },

    // Code Cat (10)
    { id: '10-1', mascot_id: '10', skill_label: 'Code review', skill_prompt: 'Review the following code snippet for improvements, bugs, and best practices: [Insert Code].' },
    { id: '10-2', mascot_id: '10', skill_label: 'Debugging', skill_prompt: 'Help me debug this code error: [Error Message] in [Language/Framework].' },
    { id: '10-3', mascot_id: '10', skill_label: 'Architecture', skill_prompt: 'Propose a software architecture for a [Application Type] that needs to handle [Requirement].' },

    // Strategy Camel (11)
    { id: '11-1', mascot_id: '11', skill_label: 'Business strategy', skill_prompt: 'Develop a business strategy for [Company/Product] to enter [Market/Segment].' },
    { id: '11-2', mascot_id: '11', skill_label: 'Goal setting', skill_prompt: 'Help me set SMART goals for [Objective/Project] for the next quarter.' },
    { id: '11-3', mascot_id: '11', skill_label: 'Roadmap planning', skill_prompt: 'Create a high-level roadmap for [Product/Project] spanning [Timeframe].' },

    // Marketing Frog (12)
    { id: '12-1', mascot_id: '12', skill_label: 'Campaign planning', skill_prompt: 'Plan a marketing campaign for [Product/Event] targeting [Audience] on [Channels].' },
    { id: '12-2', mascot_id: '12', skill_label: 'Copywriting', skill_prompt: 'Write compelling ad copy for [Product] focusing on [User Benefit].' },
    { id: '12-3', mascot_id: '12', skill_label: 'Social strategy', skill_prompt: 'Develop a social media strategy for [Brand] to increase engagement on [Platform].' },

    // Product Giraffe (13)
    { id: '13-1', mascot_id: '13', skill_label: 'PRD writing', skill_prompt: 'Draft a Product Requirements Document (PRD) for high-level feature: [Feature Name].' },
    { id: '13-2', mascot_id: '13', skill_label: 'Feature prioritization', skill_prompt: 'Help me prioritize these features for an MVP based on value vs. effort: [List features].' },
    { id: '13-3', mascot_id: '13', skill_label: 'Stakeholder management', skill_prompt: 'Draft an update email to stakeholders regarding [Project Status/Issue].' },

    // Support Lion (14)
    { id: '14-1', mascot_id: '14', skill_label: 'Customer support', skill_prompt: 'Draft a sympathetic and helpful response to a customer complaining about [Issue].' },
    { id: '14-2', mascot_id: '14', skill_label: 'FAQ creation', skill_prompt: 'Generate a list of FAQs and answers for [Product/Service].' },
    { id: '14-3', mascot_id: '14', skill_label: 'Escalation handling', skill_prompt: 'Write a script for handling an angry customer escalation regarding [Situation].' },

    // Mentor Seahorse (15)
    { id: '15-1', mascot_id: '15', skill_label: 'Career coaching', skill_prompt: 'Provide advice for navigating a career transition from [Role A] to [Role B].' },
    { id: '15-2', mascot_id: '15', skill_label: 'Resume review', skill_prompt: 'Review the following resume bullet points and suggest improvements: [Insert Points].' },
    { id: '15-3', mascot_id: '15', skill_label: 'Interview prep', skill_prompt: 'Act as an interviewer and ask me 3 common interview questions for a [Job Title] role.' },

    // Project Camel (16)
    { id: '16-1', mascot_id: '16', skill_label: 'Project planning', skill_prompt: 'Create a project plan for [Project] identifying key phases and milestones.' },
    { id: '16-2', mascot_id: '16', skill_label: 'Risk management', skill_prompt: 'Identify potential risks for [Project Type] and suggest mitigation strategies.' },
    { id: '16-3', mascot_id: '16', skill_label: 'Status reporting', skill_prompt: 'Draft a weekly status report for [Project] highlighting achievements and blockers.' },

    // Research Frog (17)
    { id: '17-1', mascot_id: '17', skill_label: 'Market analysis', skill_prompt: 'Analyze current trends in the [Industry] market.' },
    { id: '17-2', mascot_id: '17', skill_label: 'Trend research', skill_prompt: 'Research emerging trends in [Field] for the coming year.' },
    { id: '17-3', mascot_id: '17', skill_label: 'Competitor analysis', skill_prompt: 'Compare the product offerings of [Company A] and [Company B].' },

    // Agile Giraffe (18)
    { id: '18-1', mascot_id: '18', skill_label: 'Sprint planning', skill_prompt: 'Help structure a sprint planning agenda for a [Team Size] team.' },
    { id: '18-2', mascot_id: '18', skill_label: 'Retrospectives', skill_prompt: 'Suggest creative retrospective formats to engage the team.' },
    { id: '18-3', mascot_id: '18', skill_label: 'Team facilitation', skill_prompt: 'Provide tips for facilitating a productive [Meeting Type].' },

    // Brand Lion (19)
    { id: '19-1', mascot_id: '19', skill_label: 'Brand positioning', skill_prompt: 'Define a brand positioning statement for [Brand] targeting [Audience].' },
    { id: '19-2', mascot_id: '19', skill_label: 'Voice & tone', skill_prompt: 'Describe the brand voice and tone guidelines for [Company Type].' },
    { id: '19-3', mascot_id: '19', skill_label: 'Visual identity', skill_prompt: 'Suggest visual identity elements (colors, style) for a [Brand Vibes].' },

    // Dev Seahorse (20)
    { id: '20-1', mascot_id: '20', skill_label: 'Full-stack development', skill_prompt: 'Explain the best practices for building a full-stack app with [Stack].' },
    { id: '20-2', mascot_id: '20', skill_label: 'API design', skill_prompt: 'Design a RESTful API schema for resource [Resource Name].' },
    { id: '20-3', mascot_id: '20', skill_label: 'Code architecture', skill_prompt: 'Discuss the pros and cons of Monolith vs Microservices for [Project Context].' }
];

async function populateSkills() {
    // Map raw skills to use UUIDs, removing the old string ID
    const skillsToInsert = rawSkills.map(function (s) {
        return {
            id: uuidv4(),
            mascot_id: s.mascot_id,
            skill_label: s.skill_label,
            skill_prompt: s.skill_prompt
        };
    });

    console.log(`Populating ${skillsToInsert.length} skills...`);

    const { data, error } = await supabase
        .from('mascot_skills')
        .insert(skillsToInsert);

    if (error) {
        console.error('Error populating skills:', error);
    } else {
        console.log('Skills populated successfully!');
    }
}

populateSkills();
