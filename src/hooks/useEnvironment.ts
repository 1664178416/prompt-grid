'use client';

import { useHydrated } from './useHydrated';

export function useEnvironment() {
  const hydrated = useHydrated();
  const isElectron = hydrated && navigator.userAgent.toLowerCase().includes('electron');

  return { isElectron, isWeb: !isElectron };
}
