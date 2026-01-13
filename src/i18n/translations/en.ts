export const en = {
  // Common
  common: {
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },

  // Home Screen
  home: {
    title: 'My prompt squad',
    subtitle: 'Get the most out of AI',
    showAll: 'Show all',
    subscribeCta: 'Subscribe to Prompt Squad pro to unlock all for 3,99€ / month',
    createCustom: 'Create custom',
  },

  // Mascot Details
  mascot: {
    personality: 'Personality',
    usedModels: 'Used models',
    skills: 'Skills',
    startChatting: 'Start chatting',
    tryOut: 'Try out Mascot',
    unlockFor: 'Unlock for 99ct',
  },

  // Chat Screen
  chat: {
    tabs: {
      chat: 'Chat',
      sources: 'Sources',
      skills: 'Skills',
      instructions: 'Instructions',
    },
    placeholder: 'Write a message',
    thinking: 'Thinking...',
  },

  // Auth Screen
  auth: {
    loginTitle: 'Log in to your account',
    loginSubtitle: 'Welcome back! Please enter your details.',
    signupTitle: 'Create your account',
    signupSubtitle: 'Start your AI journey today.',
    tabs: {
      signup: 'Sign up',
      login: 'Log in',
    },
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: 'Confirm your password',
    rememberMe: 'Remember for 30 days',
    forgotPassword: 'Forgot password',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signInWithGoogle: 'Sign in with Google',
    signUpWithGoogle: 'Sign up with Google',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    errors: {
      invalidEmail: 'Please enter a valid email',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordMismatch: 'Passwords do not match',
      generic: 'Something went wrong. Please try again.',
    },
  },

  // Profile Screen
  profile: {
    title: 'Settings',
    subtitle: 'Customize your experience',
    appearance: 'Appearance',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    language: 'Language',
    english: 'English',
    german: 'German',
    spanish: 'Spanish',
    account: 'Account',
    signOut: 'Sign out',
    version: 'Version',
  },

  // Tabs
  tabs: {
    home: 'Home',
    profile: 'Profile',
  },

  // Mascot Names & Subtitles
  mascots: {
    analystBear: { name: 'Analyst Bear', subtitle: 'Great at research' },
    writerFox: { name: 'Writer Fox', subtitle: 'Best at writing' },
    uxPanda: { name: 'UX Panda', subtitle: 'Principal UX skills' },
    adviceZebra: { name: 'Advice Zebra', subtitle: 'Here to support' },
    teacherOwl: { name: 'Teacher Owl', subtitle: 'Lets teach our kids' },
    promptTurtle: { name: 'Prompt Turtle', subtitle: 'Get the most out of AI' },
    dataBadger: { name: 'Data Badger', subtitle: 'Analytics expert' },
    quickMouse: { name: 'Quick Mouse', subtitle: 'Fast problem solver' },
    creativePig: { name: 'Creative Pig', subtitle: 'Design thinking' },
    codeCat: { name: 'Code Cat', subtitle: 'Programming wizard' },
    strategyBear: { name: 'Strategy Bear', subtitle: 'Planning expert' },
    marketingFox: { name: 'Marketing Fox', subtitle: 'Growth hacker' },
    productPanda: { name: 'Product Panda', subtitle: 'Product management' },
    supportZebra: { name: 'Support Zebra', subtitle: 'Customer success' },
    mentorOwl: { name: 'Mentor Owl', subtitle: 'Career guidance' },
    projectTurtle: { name: 'Project Turtle', subtitle: 'Project management' },
    researchBadger: { name: 'Research Badger', subtitle: 'Market research' },
    agileMouse: { name: 'Agile Mouse', subtitle: 'Scrum master' },
    brandPig: { name: 'Brand Pig', subtitle: 'Brand strategy' },
    devCat: { name: 'Dev Cat', subtitle: 'Full-stack developer' },
  },
} as const;

export type TranslationKeys = typeof en;

