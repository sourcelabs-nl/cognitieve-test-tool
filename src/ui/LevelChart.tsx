// Eenvoudige SVG-lijngrafiek voor een niveauverloop (waarden 1..5).
// Geen externe library; bewust minimaal gehouden.

import { MIN_LEVEL, MAX_LEVEL } from '../engine/types';

interface Props {
  values: number[];
  width?: number;
  height?: number;
  label?: string;
}

export function LevelChart({ values, width = 480, height = 200, label }: Props) {
  const padding = { top: 16, right: 16, bottom: 28, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const x = (i: number) =>
    padding.left + (values.length <= 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
  const y = (v: number) =>
    padding.top + innerH - ((v - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const gridLevels = [1, 2, 3, 4, 5];

  return (
    <figure className="level-chart">
      {label && <figcaption>{label}</figcaption>}
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? 'Niveauverloop'}>
        {gridLevels.map((lvl) => (
          <g key={lvl}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(lvl)}
              y2={y(lvl)}
              className="grid-line"
            />
            <text x={4} y={y(lvl) + 4} className="axis-label">
              {lvl}
            </text>
          </g>
        ))}
        {values.length > 1 && <polyline points={points} className="trail-line" fill="none" />}
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={3.5} className="trail-dot" />
        ))}
      </svg>
    </figure>
  );
}
