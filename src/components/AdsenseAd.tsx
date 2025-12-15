// src/components/AdsenseAd.tsx
'use client';
import { useEffect, useRef } from "react";

interface AdsenseAdProps {
  className?: string;
  slot?: string;
  style?: React.CSSProperties;
}

export default function AdsenseAd({ className, slot = "1234567890", style }: AdsenseAdProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adRef.current) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("Adsense push error:", e);
      }
    }
  }, []);

  return (
    <div ref={adRef}>
      <ins
        className={`adsbygoogle ${className || ""}`}
        style={{ display: "block", ...style }}
        data-ad-client="ca-pub-4842937981886180"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
