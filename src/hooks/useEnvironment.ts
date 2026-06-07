'use client';

import { useState, useEffect } from 'react';

export function useEnvironment() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('electron')) {
        setIsElectron(true);
      }
    }
  }, []);

  return { isElectron, isWeb: !isElectron };
}
