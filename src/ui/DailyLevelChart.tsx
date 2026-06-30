// Lijngrafiek met de dagen van een 7-daags venster op de x-as en de
// niveau-schatting (1..5) op de y-as.

import { MIN_LEVEL, MAX_LEVEL } from '../engine/types';
import { addDays, type DayPoint } from '../engine/dateWindow';

interface Props {
  points: DayPoint[];
  windowStart: Date;
  days?: number;
  width?: number;
  height?: number;
}

export function DailyLevelChart({ points, windowStart, days = 7, width = 480, height = 200 }: Props) {
  const padding = { top: 16, right: 16, bottom: 34, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const x = (dayIdx: number) =>
    padding.left + (days <= 1 ? innerW / 2 : (dayIdx / (days - 1)) * innerW);
  const y = (v: number) =>
    padding.top + innerH - ((v - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)) * innerH;

  const gridLevels = [1, 2, 3, 4, 5];
  const dayLabels = Array.from({ length: days }, (_, i) => {
    const d = addDays(windowStart, i);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const line = points.map((p) => `${x(p.dayIndex)},${y(p.value)}`).join(' ');

  return (
    <figure className="level-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Niveau per dag">
        {gridLevels.map((lvl) => (
          <g key={lvl}>
            <line x1={padding.left} x2={width - padding.right} y1={y(lvl)} y2={y(lvl)} className="grid-line" />
            <text x={4} y={y(lvl) + 4} className="axis-label">{lvl}</text>
          </g>
        ))}
        {dayLabels.map((label, i) => (
          <text key={i} x={x(i)} y={height - 10} textAnchor="middle" className="axis-label">
            {label}
          </text>
        ))}
        {points.length > 1 && <polyline points={line} className="trail-line" fill="none" />}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.dayIndex)} cy={y(p.value)} r={4} className="trail-dot" />
        ))}
      </svg>
    </figure>
  );
}
