import React, { useRef } from 'react';

export default function UploadCapture({ onFile }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <div className="upload-capture-container">
      <button 
        className="btn btn-upload"
        onClick={() => fileInputRef.current?.click()}
      >
        Upload Photo
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileUpload}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleCameraCapture}
      />
    </div>
  );
}
