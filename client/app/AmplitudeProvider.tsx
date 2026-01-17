'use client';
import { useEffect } from 'react';
import { initAmplitude } from '@/lib/amplitude/client';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAmplitude();
  }, []);

  return <>{children}</>;
}
