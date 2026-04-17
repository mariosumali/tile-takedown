type Control = { key: string; label: string };

const controls: Control[] = [
  { key: 'Drag', label: 'Pick up piece' },
  { key: 'Drop', label: 'Place on grid' },
  { key: 'R', label: 'Rotate 90°' },
  { key: 'Z', label: 'Undo' },
  { key: '1/2/3', label: 'Select slot' },
  { key: 'Esc', label: 'Cancel drag' },
  { key: 'M', label: 'Mute sound' },
  { key: '?', label: 'Show controls' },
];

export default function ControlsSection() {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            How to play
          </div>
          <h2>Controls.</h2>
        </div>
      </div>

      <div className="controls-panel">
        <div className="controls-grid">
          {controls.map((c) => (
            <div key={c.key} className="control-row">
              <span className="kbd">{c.key}</span>
              <span className="control-label">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
