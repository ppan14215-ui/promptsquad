
import { Skill } from '@/components';

export const mascotImages = {
    bear: require('../../assets/mascots/Bear.png'),
    fox: require('../../assets/mascots/fox.png'),
    panda: require('../../assets/mascots/panda.png'),
    zebra: require('../../assets/mascots/zebra.png'),
    owl: require('../../assets/mascots/owl.png'),
    turtle: require('../../assets/mascots/turtle.png'),
    badger: require('../../assets/mascots/badger.png'),
    mouse: require('../../assets/mascots/mouse.png'),
    pig: require('../../assets/mascots/pig.png'),
    cat: require('../../assets/mascots/cat.png'),
    camel: require('../../assets/mascots/camel.png'),
    frog: require('../../assets/mascots/frog.png'),
    giraffe: require('../../assets/mascots/giraffe.png'),
    lion: require('../../assets/mascots/lion.png'),
    seahorse: require('../../assets/mascots/searhorse.png'),
};

export type MascotColor = 'yellow' | 'red' | 'green' | 'pink' | 'purple' | 'darkPurple' | 'brown' | 'teal' | 'orange' | 'blue';

export type OwnedMascot = {
    id: string;
    name: string;
    subtitle: string;
    image: any;
    color: MascotColor;
    questionPrompt: string;
    skills: Skill[];
    personality: string[];
    models: string[];
    isPro?: boolean;
};

export const FREE_MASCOTS: OwnedMascot[] = [
    {
        id: '1',
        name: 'Analyst Bear',
        subtitle: 'Great at research',
        image: mascotImages.bear,
        color: 'yellow',
        questionPrompt: 'What should we analyze?',
        personality: ['Analytical', 'Thorough', 'Patient'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '1-1', label: 'Stock analysis' },
            { id: '1-2', label: 'Competitive analysis' },
            { id: '1-3', label: 'Market analysis' },
        ],
    },
    {
        id: '2',
        name: 'Writer Fox',
        subtitle: 'Best at writing',
        image: mascotImages.fox,
        color: 'orange',
        questionPrompt: 'What should we write?',
        personality: ['Creative', 'Eloquent', 'Witty'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '2-1', label: 'Blog posts' },
            { id: '2-2', label: 'Email drafts' },
            { id: '2-3', label: 'Social media' },
        ],
    },
    {
        id: '3',
        name: 'UX Panda',
        subtitle: 'Principal UX skills',
        image: mascotImages.panda,
        color: 'green',
        questionPrompt: 'What can I help with?',
        personality: ['Empathetic', 'Detail-oriented', 'User-focused'],
        models: ['GPT-4o', 'Gemini Pro'],
        skills: [
            { id: '3-1', label: 'User research' },
            { id: '3-2', label: 'Wireframing' },
            { id: '3-3', label: 'Usability testing' },
        ],
    },
    {
        id: '4',
        name: 'Advice Zebra',
        subtitle: 'Here to support',
        image: mascotImages.zebra,
        color: 'pink',
        questionPrompt: 'How can I help you today?',
        personality: ['Supportive', 'Wise', 'Balanced'],
        models: ['Claude 3', 'Gemini Pro'],
        skills: [
            { id: '4-1', label: 'Life coaching' },
            { id: '4-2', label: 'Decision making' },
            { id: '4-3', label: 'Problem solving' },
        ],
    },
];

export const PREMIUM_MASCOTS: OwnedMascot[] = [
    {
        id: '5',
        name: 'Teacher Owl',
        subtitle: 'Lets teach our kids',
        image: mascotImages.owl,
        color: 'purple',
        questionPrompt: 'What shall we learn today?',
        personality: ['Patient', 'Knowledgeable', 'Encouraging'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '5-1', label: 'Lesson planning' },
            { id: '5-2', label: 'Homework help' },
            { id: '5-3', label: 'Concept explanation' },
        ],
    },
    {
        id: '6',
        name: 'Prompt Turtle',
        subtitle: 'Get the most out of AI',
        image: mascotImages.turtle,
        color: 'teal',
        questionPrompt: 'What prompt can I help craft?',
        personality: ['Methodical', 'Precise', 'Helpful'],
        models: ['GPT-4o', 'Claude 3', 'Gemini Pro'],
        skills: [
            { id: '6-1', label: 'Prompt engineering' },
            { id: '6-2', label: 'AI optimization' },
            { id: '6-3', label: 'Workflow automation' },
        ],
    },
    {
        id: '7',
        name: 'Data Badger',
        subtitle: 'Analytics expert',
        image: mascotImages.badger,
        color: 'brown',
        questionPrompt: 'What data shall we explore?',
        personality: ['Analytical', 'Persistent', 'Detail-oriented'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '7-1', label: 'Data visualization' },
            { id: '7-2', label: 'Statistical analysis' },
            { id: '7-3', label: 'Report generation' },
        ],
    },
    {
        id: '8',
        name: 'Quick Mouse',
        subtitle: 'Fast problem solver',
        image: mascotImages.mouse,
        color: 'blue',
        questionPrompt: 'What needs a quick fix?',
        personality: ['Quick', 'Resourceful', 'Efficient'],
        models: ['GPT-4o'],
        skills: [
            { id: '8-1', label: 'Quick fixes' },
            { id: '8-2', label: 'Troubleshooting' },
            { id: '8-3', label: 'Time management' },
        ],
    },
    {
        id: '9',
        name: 'Creative Pig',
        subtitle: 'Design thinking',
        image: mascotImages.pig,
        color: 'pink',
        questionPrompt: 'What shall we create?',
        personality: ['Creative', 'Playful', 'Innovative'],
        models: ['Claude 3', 'Gemini Pro'],
        skills: [
            { id: '9-1', label: 'Brainstorming' },
            { id: '9-2', label: 'Ideation' },
            { id: '9-3', label: 'Creative writing' },
        ],
    },
    {
        id: '10',
        name: 'Code Cat',
        subtitle: 'Programming wizard',
        image: mascotImages.cat,
        color: 'darkPurple',
        questionPrompt: 'What code shall we write?',
        personality: ['Logical', 'Precise', 'Patient'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '10-1', label: 'Code review' },
            { id: '10-2', label: 'Debugging' },
            { id: '10-3', label: 'Architecture' },
        ],
    },
    {
        id: '11',
        name: 'Strategy Camel',
        subtitle: 'Planning expert',
        image: mascotImages.camel,
        color: 'brown',
        questionPrompt: 'What strategy shall we plan?',
        personality: ['Strategic', 'Visionary', 'Organized'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '11-1', label: 'Business strategy' },
            { id: '11-2', label: 'Goal setting' },
            { id: '11-3', label: 'Roadmap planning' },
        ],
    },
    {
        id: '12',
        name: 'Marketing Frog',
        subtitle: 'Growth hacker',
        image: mascotImages.frog,
        color: 'teal',
        questionPrompt: 'What marketing challenge can I help with?',
        personality: ['Persuasive', 'Creative', 'Data-driven'],
        models: ['GPT-4o', 'Grok'],
        skills: [
            { id: '12-1', label: 'Campaign planning' },
            { id: '12-2', label: 'Copywriting' },
            { id: '12-3', label: 'Social strategy' },
        ],
    },
    {
        id: '13',
        name: 'Product Giraffe',
        subtitle: 'Product management',
        image: mascotImages.giraffe,
        color: 'yellow',
        questionPrompt: 'What product question can I help with?',
        personality: ['User-focused', 'Organized', 'Collaborative'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '13-1', label: 'PRD writing' },
            { id: '13-2', label: 'Feature prioritization' },
            { id: '13-3', label: 'Stakeholder management' },
        ],
    },
    {
        id: '14',
        name: 'Support Lion',
        subtitle: 'Customer success',
        image: mascotImages.lion,
        color: 'orange',
        questionPrompt: 'How can I help your customers?',
        personality: ['Empathetic', 'Patient', 'Solution-oriented'],
        models: ['Claude 3', 'GPT-4o'],
        skills: [
            { id: '14-1', label: 'Customer support' },
            { id: '14-2', label: 'FAQ creation' },
            { id: '14-3', label: 'Escalation handling' },
        ],
    },
    {
        id: '15',
        name: 'Mentor Seahorse',
        subtitle: 'Career guidance',
        image: mascotImages.seahorse,
        color: 'blue',
        questionPrompt: 'What career question can I help with?',
        personality: ['Wise', 'Encouraging', 'Experienced'],
        models: ['Claude 3', 'GPT-4o'],
        skills: [
            { id: '15-1', label: 'Career coaching' },
            { id: '15-2', label: 'Resume review' },
            { id: '15-3', label: 'Interview prep' },
        ],
    },
    {
        id: '16',
        name: 'Project Camel',
        subtitle: 'Project management',
        image: mascotImages.camel,
        color: 'orange',
        questionPrompt: 'What project can I help manage?',
        personality: ['Methodical', 'Reliable', 'Organized'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '16-1', label: 'Project planning' },
            { id: '16-2', label: 'Risk management' },
            { id: '16-3', label: 'Status reporting' },
        ],
    },
    {
        id: '17',
        name: 'Research Frog',
        subtitle: 'Market research',
        image: mascotImages.frog,
        color: 'green',
        questionPrompt: 'What research can I help with?',
        personality: ['Curious', 'Thorough', 'Analytical'],
        models: ['GPT-4o', 'Grok'],
        skills: [
            { id: '17-1', label: 'Market analysis' },
            { id: '17-2', label: 'Trend research' },
            { id: '17-3', label: 'Competitor analysis' },
        ],
    },
    {
        id: '18',
        name: 'Agile Giraffe',
        subtitle: 'Scrum master',
        image: mascotImages.giraffe,
        color: 'purple',
        questionPrompt: 'What agile question can I help with?',
        personality: ['Agile', 'Collaborative', 'Adaptive'],
        models: ['GPT-4o'],
        skills: [
            { id: '18-1', label: 'Sprint planning' },
            { id: '18-2', label: 'Retrospectives' },
            { id: '18-3', label: 'Team facilitation' },
        ],
    },
    {
        id: '19',
        name: 'Brand Lion',
        subtitle: 'Brand strategy',
        image: mascotImages.lion,
        color: 'red',
        questionPrompt: 'What brand question can I help with?',
        personality: ['Creative', 'Strategic', 'Visionary'],
        models: ['Claude 3', 'GPT-4o'],
        skills: [
            { id: '19-1', label: 'Brand positioning' },
            { id: '19-2', label: 'Voice & tone' },
            { id: '19-3', label: 'Visual identity' },
        ],
    },
    {
        id: '20',
        name: 'Dev Seahorse',
        subtitle: 'Full-stack developer',
        image: mascotImages.seahorse,
        color: 'darkPurple',
        questionPrompt: 'What development question can I help with?',
        personality: ['Technical', 'Problem-solver', 'Curious'],
        models: ['GPT-4o', 'Claude 3'],
        skills: [
            { id: '20-1', label: 'Full-stack development' },
            { id: '20-2', label: 'API design' },
            { id: '20-3', label: 'Code architecture' },
        ],
    },
];

export const ALL_MASCOTS: OwnedMascot[] = [...FREE_MASCOTS, ...PREMIUM_MASCOTS];

export const COLOR_MAP: Record<MascotColor, string> = {
    yellow: '#EDB440',
    red: '#E64140',
    green: '#74AE58',
    pink: '#EB3F71',
    purple: '#5E24CB',
    darkPurple: '#2D2E66',
    brown: '#826F57',
    teal: '#59C19D',
    orange: '#ED7437',
    blue: '#2D6CF5',
};

export const COLOR_LIGHT_MAP: Record<MascotColor, string> = {
    yellow: '#F1E4A0',
    red: '#F3ACAF',
    green: '#CCDFC6',
    pink: '#EBC7D6',
    purple: '#9AAAEE',
    darkPurple: '#B5B2CD',
    brown: '#C0B6A0',
    teal: '#B7E0D6',
    orange: '#EBBF9C',
    blue: '#A6C5FA',
};
