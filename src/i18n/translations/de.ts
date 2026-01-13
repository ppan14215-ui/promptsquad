import type { TranslationKeys } from './en';

export const de: TranslationKeys = {
  // Common
  common: {
    cancel: 'Abbrechen',
    save: 'Speichern',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
  },

  // Home Screen
  home: {
    title: 'Mein Prompt Squad',
    subtitle: 'Hole das Beste aus KI heraus',
    showAll: 'Alle anzeigen',
    subscribeCta: 'Abonniere Prompt Squad Pro und schalte alle frei für 3,99€ / Monat',
    createCustom: 'Eigenen erstellen',
  },

  // Mascot Details
  mascot: {
    personality: 'Persönlichkeit',
    usedModels: 'Verwendete Modelle',
    skills: 'Fähigkeiten',
    startChatting: 'Chat starten',
    tryOut: 'Maskottchen testen',
    unlockFor: 'Freischalten für 99ct',
  },

  // Chat Screen
  chat: {
    tabs: {
      chat: 'Chat',
      sources: 'Quellen',
      skills: 'Fähigkeiten',
      instructions: 'Anweisungen',
    },
    placeholder: 'Nachricht schreiben',
    thinking: 'Denke nach...',
  },

  // Auth Screen
  auth: {
    loginTitle: 'In dein Konto einloggen',
    loginSubtitle: 'Willkommen zurück! Bitte gib deine Daten ein.',
    signupTitle: 'Konto erstellen',
    signupSubtitle: 'Starte heute deine KI-Reise.',
    tabs: {
      signup: 'Registrieren',
      login: 'Anmelden',
    },
    email: 'E-Mail',
    emailPlaceholder: 'E-Mail eingeben',
    password: 'Passwort',
    passwordPlaceholder: 'Passwort eingeben',
    confirmPassword: 'Passwort bestätigen',
    confirmPasswordPlaceholder: 'Passwort bestätigen',
    rememberMe: '30 Tage angemeldet bleiben',
    forgotPassword: 'Passwort vergessen',
    signIn: 'Anmelden',
    signUp: 'Registrieren',
    signInWithGoogle: 'Mit Google anmelden',
    signUpWithGoogle: 'Mit Google registrieren',
    noAccount: 'Noch kein Konto?',
    hasAccount: 'Bereits ein Konto?',
    errors: {
      invalidEmail: 'Bitte gib eine gültige E-Mail ein',
      passwordTooShort: 'Passwort muss mindestens 6 Zeichen haben',
      passwordMismatch: 'Passwörter stimmen nicht überein',
      generic: 'Etwas ist schief gelaufen. Bitte versuche es erneut.',
    },
  },

  // Profile Screen
  profile: {
    title: 'Einstellungen',
    subtitle: 'Passe dein Erlebnis an',
    appearance: 'Erscheinungsbild',
    lightMode: 'Heller Modus',
    darkMode: 'Dunkler Modus',
    language: 'Sprache',
    english: 'Englisch',
    german: 'Deutsch',
    spanish: 'Spanisch',
    account: 'Konto',
    signOut: 'Abmelden',
    version: 'Version',
  },

  // Tabs
  tabs: {
    home: 'Start',
    profile: 'Profil',
  },

  // Mascot Names & Subtitles
  mascots: {
    analystBear: { name: 'Analyst Bär', subtitle: 'Großartig in Recherche' },
    writerFox: { name: 'Schreiber Fuchs', subtitle: 'Bester im Schreiben' },
    uxPanda: { name: 'UX Panda', subtitle: 'Führende UX-Fähigkeiten' },
    adviceZebra: { name: 'Ratgeber Zebra', subtitle: 'Hier um zu helfen' },
    teacherOwl: { name: 'Lehrer Eule', subtitle: 'Lass uns Kinder unterrichten' },
    promptTurtle: { name: 'Prompt Schildkröte', subtitle: 'Hole das Beste aus KI' },
    dataBadger: { name: 'Daten Dachs', subtitle: 'Analytik-Experte' },
    quickMouse: { name: 'Schnelle Maus', subtitle: 'Schneller Problemlöser' },
    creativePig: { name: 'Kreatives Schwein', subtitle: 'Design Thinking' },
    codeCat: { name: 'Code Katze', subtitle: 'Programmier-Zauberer' },
    strategyBear: { name: 'Strategie Bär', subtitle: 'Planungsexperte' },
    marketingFox: { name: 'Marketing Fuchs', subtitle: 'Growth Hacker' },
    productPanda: { name: 'Produkt Panda', subtitle: 'Produktmanagement' },
    supportZebra: { name: 'Support Zebra', subtitle: 'Kundenerfolg' },
    mentorOwl: { name: 'Mentor Eule', subtitle: 'Karriereberatung' },
    projectTurtle: { name: 'Projekt Schildkröte', subtitle: 'Projektmanagement' },
    researchBadger: { name: 'Recherche Dachs', subtitle: 'Marktforschung' },
    agileMouse: { name: 'Agile Maus', subtitle: 'Scrum Master' },
    brandPig: { name: 'Marken Schwein', subtitle: 'Markenstrategie' },
    devCat: { name: 'Dev Katze', subtitle: 'Full-Stack Entwickler' },
  },
} as const;

