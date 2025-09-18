export * from './adaptiveCards/boardCard';
export * from './awaleBot';
export * from './server';

// Placeholder runtime side-effect for now.
if (require.main === module) {
	// eslint-disable-next-line no-console
	console.log('Awale Teams Bot - Adaptive Card generator and Bot Framework integration ready.');
}

