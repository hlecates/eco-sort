import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './pwa/register-sw.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
