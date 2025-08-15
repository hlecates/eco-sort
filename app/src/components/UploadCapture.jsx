import React from 'react';

export default function UploadCapture({ onFile }) {
  return (
    <label className="btn">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      Take / Upload Photo
    </label>
  );
}
