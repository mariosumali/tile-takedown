type Size = 'sm' | 'md' | 'lg';

export default function BrandMark({ size = 'lg' }: { size?: Size }) {
  return <div className={`brand-mark sz-${size}`} aria-hidden="true" />;
}
