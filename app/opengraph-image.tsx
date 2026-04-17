import { ImageResponse } from 'next/og';

export const alt = 'Tile Takedown — a cozy browser puzzle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadGoogleFont(family: string, weight: number) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}`;
  const css = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
    },
  }).then((res) => res.text());
  const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!match) throw new Error(`Failed to load font: ${family}`);
  return await fetch(match[1]).then((res) => res.arrayBuffer());
}

const INK = '#1c1714';
const PAPER = '#f4ecd8';
const PAPER_2 = '#ecddb7';
const TOMATO = '#e85a4f';
const MUSTARD = '#e9b949';
const CREAM = '#e8ddb5';
const INK_2 = '#4a3f34';

export default async function Image() {
  const [caprasimo, frauncesReg, frauncesBold] = await Promise.all([
    loadGoogleFont('Caprasimo', 400),
    loadGoogleFont('Fraunces', 500),
    loadGoogleFont('Fraunces', 700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 88px',
          background: PAPER,
          backgroundImage: `radial-gradient(circle at 20% 20%, ${PAPER_2} 0, transparent 55%), radial-gradient(circle at 85% 80%, ${PAPER_2} 0, transparent 60%)`,
          fontFamily: 'Fraunces',
          color: INK,
        }}
      >
        {/* Top row: brand mark + wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
          }}
        >
          {/* Brand mark — big rotated tomato tile with inner tiles */}
          <div
            style={{
              display: 'flex',
              width: 132,
              height: 132,
              position: 'relative',
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
                boxShadow: `10px 10px 0 0 ${INK}`,
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
                border: `5px solid ${INK}`,
                borderRadius: 8,
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
                border: `5px solid ${INK}`,
                borderRadius: 8,
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              padding: '8px 22px',
              background: PAPER,
              border: `3px solid ${INK}`,
              borderRadius: 999,
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              boxShadow: `4px 4px 0 0 ${INK}`,
            }}
          >
            A cozy browser puzzle
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: 'Caprasimo',
              fontSize: 196,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              color: INK,
            }}
          >
            Tile Takedown
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Fraunces',
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1.2,
              maxWidth: 980,
              color: INK_2,
            }}
          >
            Place pieces, clear rows, watch the combo stack.
          </div>
        </div>

        {/* Bottom row: URL + decorative tiles */}
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
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: '0.02em',
              color: INK_2,
            }}
          >
            tiles.mariosumali.com
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            {[TOMATO, MUSTARD, '#7a8450', '#6e94b8', CREAM].map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  width: 40,
                  height: 40,
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
      fonts: [
        { name: 'Caprasimo', data: caprasimo, style: 'normal', weight: 400 },
        { name: 'Fraunces', data: frauncesReg, style: 'normal', weight: 500 },
        { name: 'Fraunces', data: frauncesBold, style: 'normal', weight: 700 },
      ],
    }
  );
}
