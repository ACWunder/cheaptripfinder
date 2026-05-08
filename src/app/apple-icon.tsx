import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(at 25% 25%, #818cf8 0px, transparent 60%),' +
            'linear-gradient(135deg, #4338ca 0%, #a21caf 100%)',
          color: 'white',
          fontSize: '120px',
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        ✦
      </div>
    ),
    { ...size },
  );
}
