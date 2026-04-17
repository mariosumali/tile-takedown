type Row = { k: string; v: string | number };

type Props = {
  rows: ReadonlyArray<Row>;
  heading?: string;
};

export default function MiniStats({ rows, heading = 'this run' }: Props) {
  return (
    <div className="card mini-stats">
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {heading}
      </div>
      {rows.map((row) => (
        <div key={row.k} className="row">
          <span className="k">{row.k}</span>
          <span className="v">{row.v}</span>
        </div>
      ))}
    </div>
  );
}
