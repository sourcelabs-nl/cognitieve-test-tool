// Beoordeling van de voortgang: een korte analyse met sterke punten en
// verbeterpunten, uitgeklapt vanaf het voortgangsscherm. Alles wordt lokaal
// berekend uit de opgeslagen sessies.

import { ThumbsUp, Target, ArrowRight } from 'lucide-react';
import type { Assessment } from '../engine/assessment';

interface Props {
  assessment: Assessment;
}

interface ListProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  empty: string;
}

function PointList({ title, icon, items, empty }: ListProps) {
  return (
    <div className="assessment-block">
      <h3>
        {icon} {title}
      </h3>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="assessment-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AssessmentPanel({ assessment }: Props) {
  return (
    <section className="assessment">
      <p className="feedback-line">{assessment.headline}</p>

      {assessment.hasData && (
        <>
          <PointList
            title="Sterke punten"
            icon={<ThumbsUp size={16} />}
            items={assessment.strengths}
            empty="Nog geen duidelijk sterk punt te zien; oefen een paar sessies door."
          />
          <PointList
            title="Verbeterpunten"
            icon={<Target size={16} />}
            items={assessment.improvements}
            empty="Geen opvallende zwakke plekken. Mooi bezig."
          />
        </>
      )}

      <p className="assessment-next">
        <ArrowRight size={16} /> {assessment.nextStep}
      </p>
    </section>
  );
}
