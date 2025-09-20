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
			console.log('🔍 Checking hash:', hash);
			const joinMatch = hash.match(/^#join-(.+)$/);
			if (joinMatch) {
				const gameId = joinMatch[1];
				console.log('🔗 Direct join link detected:', gameId);
				console.log('🎮 Setting mode to online-join and gameInfo:', { code: gameId });
				setMode('online-join');
				setGameInfo({ code: gameId });
				// Clear the hash to prevent re-processing
				window.history.replaceState(null, '', window.location.pathname);
				console.log('✅ Hash cleared, should now connect to multiplayer');
			} else {
				console.log('ℹ️ No join hash detected');
			}
		};
		
		// Check on initial load
		console.log('🚀 App starting, checking for join link...');
		checkForJoinLink();
		
		// Listen for hash changes (if user navigates back/forward)
		window.addEventListener('hashchange', checkForJoinLink);
		return () => window.removeEventListener('hashchange', checkForJoinLink);
	}, []);
	
	console.log('🎯 Current state:', { mode, gameInfo });
	
	if (!mode) {
		console.log('📋 Rendering ModeSelector (no mode set)');
		return <ModeSelector onSelect={(m, id) => { 
			console.log('🎮 ModeSelector selected:', { mode: m, id }); 
			setMode(m); 
			if (m==='online-join' && id) setGameInfo({ code: id }); 
		}} />;
	}
	
	if (mode === 'ai') {
		console.log('🤖 Rendering AI Game');
		return <Game onExit={()=> { setMode(null); setGameInfo(null); }} />;
	}
	
	console.log('🌐 Rendering OnlineGame with:', { mode, code: gameInfo?.code });
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
