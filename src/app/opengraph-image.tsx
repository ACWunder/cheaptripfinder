import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CheapTripFinder — finde das günstigste gemeinsame Reiseziel';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'radial-gradient(at 15% 20%, #c7d2fe 0px, transparent 55%),' +
            'radial-gradient(at 85% 15%, #f9a8d4 0px, transparent 50%),' +
            'radial-gradient(at 60% 100%, #7dd3fc 0px, transparent 60%),' +
            'linear-gradient(135deg, #fafaf9 0%, #f1f5f9 100%)',
          fontFamily: 'sans-serif',
          color: '#0f172a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(165,180,252,0.5)',
              color: '#4338ca',
              fontSize: '22px',
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: '24px' }}>✦</span>
            <span>Powered by Ryanair</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: '160px',
              fontWeight: 800,
              letterSpacing: '-5px',
              lineHeight: 1,
              backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #4338ca 50%, #a21caf 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            CheapTripFinder
          </div>
          <div
            style={{
              fontSize: '40px',
              color: '#475569',
              maxWidth: '900px',
              lineHeight: 1.3,
            }}
          >
            Das günstigste gemeinsame Reiseziel für zwei Freunde aus
            unterschiedlichen Städten.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                display: 'flex',
                padding: '14px 22px',
                borderRadius: '16px',
                background: 'white',
                border: '1px solid #e2e8f0',
                fontSize: '26px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              VIE → BCN ← BER
            </div>
            <div
              style={{
                display: 'flex',
                padding: '14px 22px',
                borderRadius: '16px',
                backgroundImage: 'linear-gradient(90deg, #6366f1, #d946ef)',
                fontSize: '26px',
                fontWeight: 700,
                color: 'white',
              }}
            >
              €145
            </div>
          </div>
          <div style={{ fontSize: '22px', color: '#94a3b8', display: 'flex' }}>
            cheaptripfinder
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
