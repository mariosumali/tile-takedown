import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Tile Takedown — a cozy browser puzzle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadFont(filename: string): Promise<ArrayBuffer | null> {
  try {
    const buf = await readFile(join(process.cwd(), 'app', '_og-fonts', filename));
    return buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
  } catch {
    return null;
  }
}

const INK = '#1c1714';
const PAPER = '#f4ecd8';
const PAPER_2 = '#ecddb7';
const TOMATO = '#e85a4f';
const MUSTARD = '#e9b949';
const OLIVE = '#7a8450';
const SKY = '#6e94b8';
const CREAM = '#e8ddb5';
const INK_2 = '#4a3f34';

export default async function Image() {
  const [caprasimo, frauncesMedium, frauncesBold] = await Promise.all([
    loadFont('Caprasimo-Regular.ttf'),
    loadFont('Fraunces-Medium.woff'),
    loadFont('Fraunces-Bold.woff'),
  ]);

  const fonts: {
    name: string;
    data: ArrayBuffer;
    style: 'normal';
    weight: 400 | 500 | 700;
  }[] = [];
  if (caprasimo) {
    fonts.push({
      name: 'Caprasimo',
      data: caprasimo,
      style: 'normal',
      weight: 400,
    });
  }
  if (frauncesMedium) {
    fonts.push({
      name: 'Fraunces',
      data: frauncesMedium,
      style: 'normal',
      weight: 500,
    });
  }
  if (frauncesBold) {
    fonts.push({
      name: 'Fraunces',
      data: frauncesBold,
      style: 'normal',
      weight: 700,
    });
  }

  const displayFont = caprasimo ? 'Caprasimo' : 'serif';
  const bodyFont = frauncesMedium || frauncesBold ? 'Fraunces' : 'serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          background: PAPER,
          fontFamily: bodyFont,
          color: INK,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <BrandMark size={120} />
          <div
            style={{
              display: 'flex',
              padding: '10px 24px',
              background: PAPER_2,
              border: `3px solid ${INK}`,
              borderRadius: 999,
              fontFamily: bodyFont,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              boxShadow: `4px 4px 0 0 ${INK}`,
              color: INK,
            }}
          >
            A cozy browser puzzle
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: displayFont,
              fontSize: 172,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: INK,
            }}
          >
            Tile Takedown
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: bodyFont,
              fontWeight: 500,
              fontSize: 38,
              lineHeight: 1.2,
              maxWidth: 980,
              color: INK_2,
            }}
          >
            Place pieces, clear rows, watch the combo stack.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: bodyFont,
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: '0.02em',
              color: INK_2,
            }}
          >
            tiles.mariosumali.com
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[TOMATO, MUSTARD, OLIVE, SKY, CREAM].map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  width: 36,
                  height: 36,
                  background: c,
                  border: `3px solid ${INK}`,
                  borderRadius: 8,
                  boxShadow: `3px 3px 0 0 ${INK}`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  );
}

function BrandMark({ size }: { size: number }) {
  const inner = size * 0.26;
  const cream = size * 0.34;
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: size,
        height: size,
        transform: 'rotate(-6deg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          background: TOMATO,
          border: `5px solid ${INK}`,
          borderRadius: size * 0.2,
          boxShadow: `8px 8px 0 0 ${INK}`,
        }}
      />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: size * 0.22,
          left: size * 0.22,
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
          top: size * 0.5,
          left: size * 0.5,
          width: cream,
          height: cream,
          background: CREAM,
          border: `4px solid ${INK}`,
          borderRadius: 6,
        }}
      />
    </div>
  );
}
