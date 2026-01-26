// frontend/src/components/ads/FooterAd.tsx
import { AdSense } from './AdSense';

export function FooterAd() {
  const slot = import.meta.env.VITE_ADSENSE_FOOTER_SLOT || '';

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[90px] bg-gray-100 z-40">
      <AdSense adSlot={slot} adFormat="horizontal" className="w-full h-full" />
    </div>
  );
}
