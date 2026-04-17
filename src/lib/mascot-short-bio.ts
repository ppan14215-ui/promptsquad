/**
 * Mascot copy helpers:
 * - **Details modal "Short bio"** → `mascots.bio` only, then skill fallback (never `description`).
 * - **Agents carousel / marketing paragraph** → `mascots.description` (long), then `bio`, then skill fallback.
 */

export type SkillLike = { label?: string };

/** Long marketing body: `description` first, then `bio`. */
export function explicitMarketingBio(longBio?: string | null, bio?: string | null): string {
  const a = longBio?.trim();
  if (a) return a;
  const b = bio?.trim();
  return b || '';
}

/** Same fallback when no DB copy (max 4 skills). */
export function fallbackShortBioFromSkills(name: string, skills: SkillLike[]): string {
  const displaySkills = skills.slice(0, 4);
  if (!displaySkills.length) {
    return `${name} can help with a wide range of everyday tasks and conversations.`;
  }

  const labels = displaySkills
    .map((skill) => skill.label?.trim())
    .filter((label): label is string => !!label);

  if (!labels.length) {
    return `${name} helps with tailored tasks based on your selected goals.`;
  }

  if (labels.length === 1) {
    return `${name} specializes in ${labels[0].toLowerCase()} and gives focused, practical support.`;
  }

  const primary = labels.slice(0, 3);
  const listText =
    primary.length === 2
      ? `${primary[0]} and ${primary[1]}`
      : `${primary[0]}, ${primary[1]}, and ${primary[2]}`;
  const suffix = labels.length > 3 ? ', plus additional related workflows' : '';

  return `${name} helps with ${listText.toLowerCase()}${suffix}, so you can move from ideas to clear outcomes faster.`;
}

/** Agents panel / carousel description (long bio when set). */
export function resolveMascotMarketingDescription(input: {
  longBio?: string | null;
  bio?: string | null;
  name: string;
  skills?: SkillLike[];
}): string {
  const ex = explicitMarketingBio(input.longBio, input.bio);
  if (ex) return ex;
  return fallbackShortBioFromSkills(input.name, input.skills ?? []);
}

/** MascotDetails "Short bio" section: card line only, not `description`. */
export function resolveMascotDetailsShortBio(input: {
  bio?: string | null;
  name: string;
  skills?: SkillLike[];
}): string {
  const short = input.bio?.trim();
  if (short) return short;
  return fallbackShortBioFromSkills(input.name, input.skills ?? []);
}
