// src/hooks/useOrtSession.js
import * as ort from 'onnxruntime-web';
import { useEffect, useState } from 'react';
import { MODEL_URL, LABELS_URL } from '../config/constants.js';

export function useOrtSession() {
  const [session, setSession] = useState(null);
  const [labels, setLabels] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { (async () => {
    try {
      // 0) Load labels
      const r = await fetch(LABELS_URL);
      if (!r.ok) throw new Error(`Failed to load labels: ${r.status}`);
      setLabels(await r.json());

      // 1) Tell ORT where its assets live
      const DEV = import.meta.env.DEV;
      ort.env.wasm.wasmPaths = DEV
        ? 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/'
        : '/ort-wasm/';

      // 2) SIMD preferred
      ort.env.wasm.simd = true;

      // 3) IMPORTANT: don't use worker/proxy in dev (avoids jsep import from /public)
      if (DEV) {
        ort.env.wasm.proxy = false;
        ort.env.wasm.numThreads = 1;
      } else {
        const coi = Boolean(self.crossOriginIsolated);
        ort.env.wasm.proxy = coi;
        ort.env.wasm.numThreads = coi ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      }

      // 4) Single attempt first (SIMD)
      try {
        const s = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
        setSession(s); return;
      } catch (e) {
        console.warn('ORT init (SIMD) failed → fallback baseline', e);
      }

      // 5) Fallback: baseline WASM
      ort.env.wasm.simd = false;
      const s = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
      setSession(s);
    } catch (err) {
      console.error('ORT init error:', err);
      setError(err);
    }
  })(); }, []);

  return { session, labels, error };
}
