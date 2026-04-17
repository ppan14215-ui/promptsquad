/**
 * User-facing model names for the 2026 flagship stack.
 * Keep edge function API ids (gpt-5.4, gemini-3-*-preview, etc.) aligned with provider docs when rotating.
 */
export const AI_MODEL_DISPLAY = {
  openai: 'OpenAI GPT-5.4',
  gemini: 'Google Gemini 3.1 Pro',
  geminiFlash: 'Google Gemini 3.1 Pro',
  perplexity: 'Perplexity Sonar Reasoning Pro',
  grok: 'xAI Grok 4.1',
  claude: 'Anthropic Claude 4.5 Sonnet',
  /** Compact tags for mascot cards / chips */
  chipOpenai: 'GPT-5.4',
  chipGemini: 'Gemini 3.1',
  chipGrok: 'Grok 4.1',
  chipClaude: 'Claude 4.5',
  chipPerplexity: 'Perplexity',
} as const;

/** Primary line in LLM picker (model only — company goes in `LLM_VENDOR`). */
export const LLM_PICKER_LABEL = {
  gemini: 'Gemini 3.1 Pro',
  openai: 'GPT-5.4',
  perplexity: 'Sonar Reasoning Pro',
  grok: 'Grok 4.1',
  claude: 'Claude 4.5 Sonnet',
} as const;

export const LLM_VENDOR = {
  gemini: 'Google',
  openai: 'OpenAI',
  perplexity: 'Perplexity',
  grok: 'xAI',
  claude: 'Anthropic',
} as const;

/** Second line for Auto in the LLM picker (not a company name). */
export const LLM_AUTO_SUBTITLE = 'Best model per task';

export const LLM_OPTION_DESCRIPTIONS = {
  gemini: 'Google frontier multimodal (latest Pro)',
  openai: 'OpenAI flagship for reasoning & coding',
  perplexity: 'Web-grounded reasoning research',
  grok: 'xAI with live X and search',
  claude: 'Long-form articulation & creativity',
} as const;
