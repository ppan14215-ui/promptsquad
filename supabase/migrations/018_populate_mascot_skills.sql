INSERT INTO mascot_skills (id, mascot_id, skill_label, skill_prompt) VALUES
-- Analyst Bear (1)
(gen_random_uuid(), '1', 'Stock analysis', 'Perform a detailed stock analysis considering technical and fundamental indicators.'),
(gen_random_uuid(), '1', 'Competitive analysis', 'Analyze the competitive landscape for [Industry/Company], identifying key competitors, their strengths, weaknesses, and market share.'),
(gen_random_uuid(), '1', 'Market analysis', 'Conduct a comprehensive market analysis for [Market/Industry], including trends, growth drivers, and potential risks.'),

-- Writer Fox (2)
(gen_random_uuid(), '2', 'Blog posts', 'Write an engaging blog post about [Topic], approx [Word Count] words, targeting [Audience].'),
(gen_random_uuid(), '2', 'Email drafts', 'Draft a professional email to [Recipient] regarding [Subject], with a tone of [Tone].'),
(gen_random_uuid(), '2', 'Social media', 'Create a series of social media posts for [Platform] about [Topic], including hashtags.'),

-- UX Panda (3)
(gen_random_uuid(), '3', 'User research', 'Plan a user research study to understand [User Goal/Problem], including methodologies and key questions.'),
(gen_random_uuid(), '3', 'Wireframing', 'Describe the wireframe layout for a [Screen/Feature], detailing the placement of key elements and navigation.'),
(gen_random_uuid(), '3', 'Usability testing', 'Design a usability test script for [Product/Feature] to evaluate [Metric/Flow].'),

-- Advice Zebra (4)
(gen_random_uuid(), '4', 'Life coaching', 'Act as a life coach and help me work through [Issue/Goal], providing actionable advice and perspective.'),
(gen_random_uuid(), '4', 'Decision making', 'Help me make a decision about [Choice A vs Choice B] by analyzing the pros, cons, and long-term implications.'),
(gen_random_uuid(), '4', 'Problem solving', 'Help me solve the problem of [Problem Description] by breaking it down into manageable steps.'),

-- Teacher Owl (5)
(gen_random_uuid(), '5', 'Lesson planning', 'Create a lesson plan for [Subject] on the topic of [Topic] for [Grade Level], including objectives and activities.'),
(gen_random_uuid(), '5', 'Homework help', 'Explain the concept of [Concept] in a simple, easy-to-understand way, as if explaining to a student.'),
(gen_random_uuid(), '5', 'Concept explanation', 'Provide a clear and concise explanation of [Complex Term/Idea] with examples.'),

-- Prompt Turtle (6)
(gen_random_uuid(), '6', 'Prompt engineering', 'Optimize the following prompt to get better results from an AI model: [Insert Prompt].'),
(gen_random_uuid(), '6', 'AI optimization', 'Suggest ways to optimize [Workflow/Process] using AI tools and automation.'),
(gen_random_uuid(), '6', 'Workflow automation', 'Outline a workflow automation strategy for [Task/Process] to increase efficiency.'),

-- Data Badger (7)
(gen_random_uuid(), '7', 'Data visualization', 'Suggest the best way to visualize [Data Type/Set] to highlight [Key Insight].'),
(gen_random_uuid(), '7', 'Statistical analysis', 'Explain the statistical significance of [Result/Observation] and what test should be used.'),
(gen_random_uuid(), '7', 'Report generation', 'Structure a data report for [Stakeholder] analyzing [Metrics/KPIs].'),

-- Quick Mouse (8)
(gen_random_uuid(), '8', 'Quick fixes', 'Provide a quick solution or workaround for the error/issue: [Error Message/Issue].'),
(gen_random_uuid(), '8', 'Troubleshooting', 'Walk me through the troubleshooting steps for [Device/Software Problem].'),
(gen_random_uuid(), '8', 'Time management', 'Suggest quick time management tips to efficiently handle [Task/Project].'),

-- Creative Pig (9)
(gen_random_uuid(), '9', 'Brainstorming', 'Brainstorm 10 creative ideas for [Project/Theme].'),
(gen_random_uuid(), '9', 'Ideation', 'Generate innovative concepts for a new [Product/Service].'),
(gen_random_uuid(), '9', 'Creative writing', 'Write a short creative piece involving [Characters/Setting] with a theme of [Theme].'),

-- Code Cat (10)
(gen_random_uuid(), '10', 'Code review', 'Review the following code snippet for improvements, bugs, and best practices: [Insert Code].'),
(gen_random_uuid(), '10', 'Debugging', 'Help me debug this code error: [Error Message] in [Language/Framework].'),
(gen_random_uuid(), '10', 'Architecture', 'Propose a software architecture for a [Application Type] that needs to handle [Requirement].'),

-- Strategy Camel (11)
(gen_random_uuid(), '11', 'Business strategy', 'Develop a business strategy for [Company/Product] to enter [Market/Segment].'),
(gen_random_uuid(), '11', 'Goal setting', 'Help me set SMART goals for [Objective/Project] for the next quarter.'),
(gen_random_uuid(), '11', 'Roadmap planning', 'Create a high-level roadmap for [Product/Project] spanning [Timeframe].'),

-- Marketing Frog (12)
(gen_random_uuid(), '12', 'Campaign planning', 'Plan a marketing campaign for [Product/Event] targeting [Audience] on [Channels].'),
(gen_random_uuid(), '12', 'Copywriting', 'Write compelling ad copy for [Product] focusing on [User Benefit].'),
(gen_random_uuid(), '12', 'Social strategy', 'Develop a social media strategy for [Brand] to increase engagement on [Platform].'),

-- Product Giraffe (13)
(gen_random_uuid(), '13', 'PRD writing', 'Draft a Product Requirements Document (PRD) for high-level feature: [Feature Name].'),
(gen_random_uuid(), '13', 'Feature prioritization', 'Help me prioritize these features for an MVP based on value vs. effort: [List features].'),
(gen_random_uuid(), '13', 'Stakeholder management', 'Draft an update email to stakeholders regarding [Project Status/Issue].'),

-- Support Lion (14)
(gen_random_uuid(), '14', 'Customer support', 'Draft a sympathetic and helpful response to a customer complaining about [Issue].'),
(gen_random_uuid(), '14', 'FAQ creation', 'Generate a list of FAQs and answers for [Product/Service].'),
(gen_random_uuid(), '14', 'Escalation handling', 'Write a script for handling an angry customer escalation regarding [Situation].'),

-- Mentor Seahorse (15)
(gen_random_uuid(), '15', 'Career coaching', 'Provide advice for navigating a career transition from [Role A] to [Role B].'),
(gen_random_uuid(), '15', 'Resume review', 'Review the following resume bullet points and suggest improvements: [Insert Points].'),
(gen_random_uuid(), '15', 'Interview prep', 'Act as an interviewer and ask me 3 common interview questions for a [Job Title] role.'),

-- Project Camel (16)
(gen_random_uuid(), '16', 'Project planning', 'Create a project plan for [Project] identifying key phases and milestones.'),
(gen_random_uuid(), '16', 'Risk management', 'Identify potential risks for [Project Type] and suggest mitigation strategies.'),
(gen_random_uuid(), '16', 'Status reporting', 'Draft a weekly status report for [Project] highlighting achievements and blockers.'),

-- Research Frog (17)
(gen_random_uuid(), '17', 'Market analysis', 'Analyze current trends in the [Industry] market.'),
(gen_random_uuid(), '17', 'Trend research', 'Research emerging trends in [Field] for the coming year.'),
(gen_random_uuid(), '17', 'Competitor analysis', 'Compare the product offerings of [Company A] and [Company B].'),

-- Agile Giraffe (18)
(gen_random_uuid(), '18', 'Sprint planning', 'Help structure a sprint planning agenda for a [Team Size] team.'),
(gen_random_uuid(), '18', 'Retrospectives', 'Suggest creative retrospective formats to engage the team.'),
(gen_random_uuid(), '18', 'Team facilitation', 'Provide tips for facilitating a productive [Meeting Type].'),

-- Brand Lion (19)
(gen_random_uuid(), '19', 'Brand positioning', 'Define a brand positioning statement for [Brand] targeting [Audience].'),
(gen_random_uuid(), '19', 'Voice & tone', 'Describe the brand voice and tone guidelines for [Company Type].'),
(gen_random_uuid(), '19', 'Visual identity', 'Suggest visual identity elements (colors, style) for a [Brand Vibes].'),

-- Dev Seahorse (20)
(gen_random_uuid(), '20', 'Full-stack development', 'Explain the best practices for building a full-stack app with [Stack].'),
(gen_random_uuid(), '20', 'API design', 'Design a RESTful API schema for resource [Resource Name].'),
(gen_random_uuid(), '20', 'Code architecture', 'Discuss the pros and cons of Monolith vs Microservices for [Project Context].');
