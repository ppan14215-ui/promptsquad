import type { ReactNode } from 'react';

/** Native / default: no DOM portal (see `skillTooltipWebPortal.web.ts` on web). */
export function portalSkillTooltipToBody(_node: ReactNode): null {
  return null;
}
