import type { TranslationKeys } from './en';

export const es: TranslationKeys = {
  // Common
  common: {
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
  },

  // Home Screen
  home: {
    title: 'Mi prompt squad',
    subtitle: 'Saca el máximo partido a la IA',
    showAll: 'Mostrar todo',
    subscribeCta: 'Suscríbete a Prompt Squad Pro para desbloquear todo y crear mascotas personalizadas con habilidades por 9,99€ / mes',
    createCustom: 'Crear personalizado',
  },

  // Mascot Details
  mascot: {
    personality: 'Personalidad',
    usedModels: 'Modelos utilizados',
    skills: 'Habilidades',
    startChatting: 'Iniciar chat',
    tryOut: 'Probar mascota',
    unlockFor: 'Desbloquear por 2,99€',
    unlockForFree: 'Desbloquear por 1,99€',
  },

  // Chat Screen
  chat: {
    tabs: {
      chat: 'Chat',
      sources: 'Fuentes',
      skills: 'Habilidades',
      personality: 'Personalidad',
      bio: 'Bio',
    },
    placeholder: 'Escribe un mensaje',
    thinking: 'Pensando...',
  },

  // Auth Screen
  auth: {
    loginTitle: 'Inicia sesión en tu cuenta',
    loginSubtitle: '¡Bienvenido de nuevo! Por favor ingresa tus datos.',
    signupTitle: 'Crea tu cuenta',
    signupSubtitle: 'Comienza tu viaje con IA hoy.',
    tabs: {
      signup: 'Registrarse',
      login: 'Iniciar sesión',
    },
    email: 'Correo',
    emailPlaceholder: 'Ingresa tu correo',
    password: 'Contraseña',
    passwordPlaceholder: 'Ingresa tu contraseña',
    confirmPassword: 'Confirmar contraseña',
    confirmPasswordPlaceholder: 'Confirma tu contraseña',
    rememberMe: 'Recordar',
    forgotPassword: 'Olvidé mi contraseña',
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
    signInWithGoogle: 'Iniciar sesión con Google',
    signUpWithGoogle: 'Registrarse con Google',
    noAccount: '¿No tienes cuenta?',
    hasAccount: '¿Ya tienes cuenta?',
    errors: {
      invalidEmail: 'Por favor ingresa un correo válido',
      passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
      passwordMismatch: 'Las contraseñas no coinciden',
      generic: 'Algo salió mal. Por favor intenta de nuevo.',
    },
  },

  // Profile Screen
  profile: {
    title: 'Configuración',
    subtitle: 'Personaliza tu experiencia',
    appearance: 'Apariencia',
    lightMode: 'Modo claro',
    darkMode: 'Modo oscuro',
    language: 'Idioma',
    english: 'Inglés',
    german: 'Alemán',
    spanish: 'Español',
    aiProvider: 'Proveedor de IA',
    auto: 'Automático',
    autoDesc: 'Mejor modelo para la tarea',
    gemini: 'Google Gemini 3',
    geminiDesc: 'Google Frontier (Preview)',
    openai: 'OpenAI GPT-5.2',
    openaiDesc: 'El modelo más inteligente',
    perplexity: 'Perplexity Sonar',
    perplexityDesc: 'Deep web research',
    grok: 'xAI Grok 4.1',
    grokDesc: 'xAI Flagship',
    account: 'Cuenta',
    signOut: 'Cerrar sesión',
    version: 'Versión',
  },

  // Tabs
  tabs: {
    home: 'Inicio',
    profile: 'Perfil',
  },

  // Mascot Names & Subtitles
  mascots: {
    analystBear: { name: 'Oso Analista', subtitle: 'Excelente en investigación' },
    writerFox: { name: 'Zorro Escritor', subtitle: 'El mejor escribiendo' },
    uxPanda: { name: 'Panda UX', subtitle: 'Habilidades UX principales' },
    adviceZebra: { name: 'Cebra Consejera', subtitle: 'Aquí para apoyar' },
    teacherOwl: { name: 'Búho Maestro', subtitle: 'Enseñemos a los niños' },
    promptTurtle: { name: 'Tortuga Prompt', subtitle: 'Saca el máximo de la IA' },
    dataBadger: { name: 'Tejón de Datos', subtitle: 'Experto en análisis' },
    quickMouse: { name: 'Ratón Rápido', subtitle: 'Solucionador veloz' },
    creativePig: { name: 'Cerdo Creativo', subtitle: 'Pensamiento de diseño' },
    codeCat: { name: 'Gato Programador', subtitle: 'Mago de la programación' },
    strategyBear: { name: 'Oso Estratega', subtitle: 'Experto en planificación' },
    marketingFox: { name: 'Zorro de Marketing', subtitle: 'Growth hacker' },
    productPanda: { name: 'Panda de Producto', subtitle: 'Gestión de producto' },
    supportZebra: { name: 'Cebra de Soporte', subtitle: 'Éxito del cliente' },
    mentorOwl: { name: 'Búho Mentor', subtitle: 'Orientación profesional' },
    projectTurtle: { name: 'Tortuga de Proyectos', subtitle: 'Gestión de proyectos' },
    researchBadger: { name: 'Tejón Investigador', subtitle: 'Investigación de mercado' },
    agileMouse: { name: 'Ratón Ágil', subtitle: 'Scrum master' },
    brandPig: { name: 'Cerdo de Marca', subtitle: 'Estrategia de marca' },
    devCat: { name: 'Gato Dev', subtitle: 'Desarrollador full-stack' },
  },
} as const;

