import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './components/Game';
import { ModeSelector } from './components/ModeSelector';
import { OnlineGame } from './components/OnlineGame';
// style.css now linked directly in index.html to avoid esbuild processing of background image path

const App: React.FC = () => {
	const [mode, setMode] = useState<'ai' | 'online-create' | 'online-join' | null>(null);
	const [gameInfo, setGameInfo] = useState<{ code?: string; role?: string } | null>(null);
	
	// Check for direct join links on load
	useEffect(() => {
		const checkForJoinLink = () => {
			const hash = window.location.hash;
			const joinMatch = hash.match(/^#join-(.+)$/);
			if (joinMatch) {
				const gameId = joinMatch[1];
				console.log('🔗 Direct join link detected:', gameId);
				setMode('online-join');
				setGameInfo({ code: gameId });
				// Clear the hash to prevent re-processing
				window.history.replaceState(null, '', window.location.pathname);
			}
		};
		
		// Check on initial load
		checkForJoinLink();
		
		// Listen for hash changes (if user navigates back/forward)
		window.addEventListener('hashchange', checkForJoinLink);
		return () => window.removeEventListener('hashchange', checkForJoinLink);
	}, []);
	
	if (!mode) return <ModeSelector onSelect={(m, id) => { setMode(m); if (m==='online-join' && id) setGameInfo({ code: id }); }} />;
	if (mode === 'ai') return <Game onExit={()=> { setMode(null); setGameInfo(null); }} />;
	const serverUrl = (import.meta as any).env?.VITE_AWALE_SERVER_WS || (window as any).__AWALE_SERVER__ || 'wss://awale-server.livelybay-5ef501af.francecentral.azurecontainerapps.io/ws';
	return <OnlineGame mode={mode} code={gameInfo?.code} onExit={()=> { setMode(null); setGameInfo(null); }} serverUrl={serverUrl} />;
};

createRoot(document.getElementById('root')!).render(<App />);

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
