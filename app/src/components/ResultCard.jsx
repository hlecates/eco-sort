import React from 'react';
import { tipFor } from '../config/labels';

function Badge({ top }) {
  return <span className={`badge ${top}`}>{top === 'unsure' ? 'UNSURE' : top.toUpperCase()}</span>;
}

export default function ResultCard({ result }) {
  if (!result) return null;
  const { top, label, p } = result;
  const subtype = label?.split(':')[1]?.replaceAll('_',' ');
  const percentage = (p*100).toFixed(1);
  
  return (
    <div className="result">
      <div className="result-header">
        <Badge top={top} />
        {top !== 'unsure' && subtype && <span className="subtype">· {subtype}</span>}
      </div>
      
      <div className="percentage">
        {percentage}%
      </div>
      
      <div className="tips">
        {tipFor(top)}
        {top === 'unsure' && (
          <div className="upload-again">
            Try uploading a clearer photo or a different angle
          </div>
        )}
      </div>
    </div>
  );
}
