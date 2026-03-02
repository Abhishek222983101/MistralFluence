'use client';

import { useEffect, useState } from 'react';

import type { DeviceTier } from '@/lib/hero/types';

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>('desktop');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');

    const sync = (): void => {
      setTier(media.matches ? 'mobile' : 'desktop');
    };

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return tier;
}
