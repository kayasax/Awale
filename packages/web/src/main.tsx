import React from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './components/Game';
// style.css now linked directly in index.html to avoid esbuild processing of background image path

createRoot(document.getElementById('root')!).render(<Game />);

if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./sw.js').then(reg => {
			if (reg.waiting) {
				showUpdateToast(reg.waiting);
			}
			reg.addEventListener('updatefound', () => {
				const sw = reg.installing;
				if (!sw) return;
				sw.addEventListener('statechange', () => {
					if (sw.state === 'installed' && navigator.serviceWorker.controller) {
						showUpdateToast(sw);
					}
				});
			});
		}).catch(console.error);
	});
}

function showUpdateToast(sw: ServiceWorker) {
	let toast = document.querySelector('.update-toast');
	if (!toast) {
		toast = document.createElement('div');
		toast.className = 'update-toast';
		toast.innerHTML = '<span>New version available</span> <button>Refresh</button>';
		document.body.appendChild(toast);
		toast.querySelector('button')!.addEventListener('click', () => {
			sw.postMessage('SKIP_WAITING');
			setTimeout(() => window.location.reload(), 300);
		});
	}
}
