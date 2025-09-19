import React from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './components/Game';
import './style.css';

createRoot(document.getElementById('root')!).render(<Game />);
