import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Runtime entrypoint only. App.jsx is the shell; SimulationEngine owns the runtime body.
const container = document.getElementById('root');
if (!container) {
  throw new Error('QICN bootstrap failed: #root container not found.');
}

const root = createRoot(container);
root.render(<App />);
