import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const INK = '#1c1714';
const PAPER = '#f4ecd8';
const TOMATO = '#e85a4f';
const MUSTARD = '#e9b949';
const CREAM = '#e8ddb5';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: PAPER,
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: 128,
            height: 128,
            transform: 'rotate(-6deg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              inset: 0,
              background: TOMATO,
              border: `6px solid ${INK}`,
              borderRadius: 28,
              boxShadow: `7px 7px 0 0 ${INK}`,
            }}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: '22%',
              left: '22%',
              width: '24%',
              height: '24%',
              background: MUSTARD,
              border: `4px solid ${INK}`,
              borderRadius: 6,
            }}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              right: '16%',
              bottom: '16%',
              width: '32%',
              height: '32%',
              background: CREAM,
              border: `4px solid ${INK}`,
              borderRadius: 6,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
