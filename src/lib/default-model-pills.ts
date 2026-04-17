import { AI_MODEL_DISPLAY } from '@/constants/ai-models';

/** Maps `mascot_skills.preferred_provider` (and picker codes) to compact chip labels. */
const PROVIDER_TO_CHIP: Record<string, string> = {
  openai: AI_MODEL_DISPLAY.chipOpenai,
  gemini: AI_MODEL_DISPLAY.chipGemini,
  grok: AI_MODEL_DISPLAY.chipGrok,
  perplexity: AI_MODEL_DISPLAY.chipPerplexity,
  claude: AI_MODEL_DISPLAY.chipClaude,
};

export type SkillWithPreferredProvider = {
  preferredProvider?: string | null;
};

/**
 * Union of explicit default models from skill settings (non-auto `preferred_provider`),
 * in first-seen order. If none, uses `fallbackChipLabels` (e.g. mascot card defaults).
 * If still empty, returns `['Auto']`.
 */
export function defaultModelPillLabelsFromSkills(
  skills: SkillWithPreferredProvider[],
  fallbackChipLabels: string[]
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const s of skills) {
    const raw = s.preferredProvider;
    if (raw == null || String(raw).trim() === '') continue;
    const p = String(raw).toLowerCase().trim();
    if (p === 'auto') continue;
    const chip = PROVIDER_TO_CHIP[p];
    if (chip && !seen.has(chip)) {
      seen.add(chip);
      ordered.push(chip);
    }
  }
  if (ordered.length > 0) return ordered;
  const fb = (fallbackChipLabels ?? []).filter(Boolean);
  if (fb.length > 0) return [...new Set(fb)];
  return ['Auto'];
}
