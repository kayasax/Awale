import React from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './components/Game';
// style.css now linked directly in index.html to avoid esbuild processing of background image path

createRoot(document.getElementById('root')!).render(<Game />);
