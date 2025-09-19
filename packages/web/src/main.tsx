import React from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './components/Game';
// style.css now linked directly in index.html to avoid esbuild processing of background image path

createRoot(document.getElementById('root')!).render(<Game />);

if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./sw.js').catch(console.error);
	});
}
