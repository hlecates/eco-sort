// src/App.jsx
import React, { useState } from 'react';
import { useOrtSession } from './hooks/useOrtSession';
import UploadCapture from './components/UploadCapture';
import ResultCard from './components/ResultCard';
import { fileToTensor } from './utils/preprocess';
import { decide } from './utils/postprocess';
import './styles/App.css';

export default function App() {
  const { session, labels, error } = useOrtSession();
  const [previewURL, setPreviewURL] = useState(null);
  const [result, setResult] = useState(null);
  const ready = !!session && !!labels;

  const onFile = async (file) => {
    setPreviewURL(URL.createObjectURL(file));
    if (ready) {
      try {
        const { input_size: SIZE, mean: MEAN, std: STD, classes } = labels;
        const tensor = await fileToTensor(file, SIZE, MEAN, STD);
        const outputs = await session.run({ [session.inputNames[0]]: tensor });
        const logits = Array.from(outputs[session.outputNames[0]].data);
        setResult(decide(logits, classes));
      } catch (e) {
        console.error('Processing error:', e);
        setResult({ top: 'unsure', p: 0 });
      }
    }
  };

  if (error) {
    return (
      <main>
        <p style={{color:'tomato'}}>Model load error: {String(error)}</p>
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>EcoSort</h1>
        <p className="subtitle">Point. Snap. Sort.</p>
      </header>

      <section className="controls">
        <UploadCapture onFile={onFile} />
        {!ready && <span style={{marginLeft:12}}>Loading model…</span>}
      </section>

      <section className="stage">
        {previewURL && <img src={previewURL} alt="preview" id="preview" />}
        <ResultCard result={result} />
      </section>

      <footer className="footer-note">
        <small>All in your browser. No uploads. Works offline after first load.</small>
      </footer>
    </main>
  );
}
