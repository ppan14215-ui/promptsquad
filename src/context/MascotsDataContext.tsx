import React, { createContext, useContext } from 'react';
import { useMascots } from '@/services/admin';

type MascotsDataContextValue = ReturnType<typeof useMascots>;

const MascotsDataContext = createContext<MascotsDataContextValue | null>(null);

/** Single shared mascot list for the app so Admin saves are visible on Agents/Home without stale copies. */
export function MascotsDataProvider({ children }: { children: React.ReactNode }) {
  const value = useMascots();
  return <MascotsDataContext.Provider value={value}>{children}</MascotsDataContext.Provider>;
}

export function useMascotsData(): MascotsDataContextValue {
  const ctx = useContext(MascotsDataContext);
  if (!ctx) {
    throw new Error('useMascotsData must be used within MascotsDataProvider');
  }
  return ctx;
}
