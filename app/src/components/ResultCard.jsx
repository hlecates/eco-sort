import React from 'react';
import { tipFor } from '../config/labels';

function Badge({ top }) {
  return <span className={`badge ${top}`}>{top === 'unsure' ? 'UNSURE' : top.toUpperCase()}</span>;
}

export default function ResultCard({ result }) {
  if (!result) return null;
  const { top, label, p } = result;
  const subtype = label?.split(':')[1]?.replaceAll('_',' ');
  return (
    <div className="result">
      <div>
        <Badge top={top} /> {top !== 'unsure' && subtype ? `· ${subtype}` : ''} ({(p*100).toFixed(1)}%)
      </div>
      <div className="tips">{tipFor(top)}</div>
    </div>
  );
}
