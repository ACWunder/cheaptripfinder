import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)',
          borderRadius: '7px',
          color: 'white',
          fontSize: '22px',
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
