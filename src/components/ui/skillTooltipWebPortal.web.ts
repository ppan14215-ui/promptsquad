import type { ReactNode, ReactPortal } from 'react';

type CreatePortal = (node: ReactNode, container: Element | DocumentFragment) => ReactPortal;

export function portalSkillTooltipToBody(node: ReactNode): ReactNode {
  if (typeof document === 'undefined') return null;
  // Avoid static `react-dom` import in files TypeScript always typechecks (keeps tsc happy without @types/react-dom).
  const { createPortal } = require('react-dom') as { createPortal: CreatePortal };
  return createPortal(node, document.body);
}
