/** Tiny inline-SVG sparkline (no dependency). Draws an area + line + endpoint
 * dot for a numeric series. Colors inherit via currentColor / props. */

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ data, width = 88, height = 26, color = 'var(--c-primary)', className }: Props) {
  const n = data.length;
  if (n === 0) return <svg width={width} height={height} className={className} aria-hidden />;
  const max = Math.max(1, ...data);
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const x = (i: number) => (n === 1 ? width / 2 : pad + (i / (n - 1)) * w);
  const y = (v: number) => pad + h - (v / max) * h;
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `M${x(0).toFixed(1)},${(height - pad).toFixed(1)} L${pts.join(' L')} L${x(n - 1).toFixed(1)},${(height - pad).toFixed(1)} Z`;
  const lastX = x(n - 1);
  const lastY = y(data[n - 1]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden focusable="false">
      <path d={area} fill={color} opacity="0.14" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.1" fill={color} />
    </svg>
  );
}
