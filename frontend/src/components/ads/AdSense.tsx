// frontend/src/components/ads/AdSense.tsx
import { useEffect, useRef } from 'react';

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'horizontal' | 'vertical';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdSense({ adSlot, adFormat = 'horizontal', className }: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      isLoaded.current = true;
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID;

  if (!clientId || import.meta.env.DEV) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center text-gray-500 text-sm ${className}`}>
        광고 영역 (개발 모드)
      </div>
    );
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client={clientId}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
}
