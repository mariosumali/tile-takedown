import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const INK = '#1c1714';
const PAPER = '#f4ecd8';
const TOMATO = '#e85a4f';
const MUSTARD = '#e9b949';
const CREAM = '#e8ddb5';

export default function AppleIcon() {
  const tile = 128;
  const inner = tile * 0.26;
  const cream = tile * 0.34;

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
            width: tile,
            height: tile,
            transform: 'rotate(-6deg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              width: tile,
              height: tile,
              background: TOMATO,
              border: `5px solid ${INK}`,
              borderRadius: 28,
              boxShadow: `6px 6px 0 0 ${INK}`,
            }}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: tile * 0.22,
              left: tile * 0.22,
              width: inner,
              height: inner,
              background: MUSTARD,
              border: `4px solid ${INK}`,
              borderRadius: 6,
            }}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: tile * 0.5,
              left: tile * 0.5,
              width: cream,
              height: cream,
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
