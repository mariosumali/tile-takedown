type Props = {
  used: number;
  total?: number;
};

export default function UndoCard({ used, total = 3 }: Props) {
  return (
    <div className="card undo-card">
      <div className="eyebrow">undos left</div>
      <div className="undo-coins" aria-label={`${total - used} undos remaining`}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={i < total - used ? '' : 'spent'}>
            &#8630;
          </span>
        ))}
      </div>
    </div>
  );
}
