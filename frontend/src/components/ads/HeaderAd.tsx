// frontend/src/components/ads/HeaderAd.tsx
import { AdSense } from './AdSense';

export function HeaderAd() {
  const slot = import.meta.env.VITE_ADSENSE_HEADER_SLOT || '';

  return (
    <div className="w-full h-[90px] bg-gray-100">
      <AdSense adSlot={slot} adFormat="horizontal" className="w-full h-full" />
    </div>
  );
}
