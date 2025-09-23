// Auto-generated or simple re-export for version; updated at build time if desired.
// For dev (Vite) we can import package.json directly using assert { type: 'json' } if configured, but keep simple constant.
// In Vite dev, process may be undefined unless polyfilled. Use import.meta.env first, then fallback.
// The esbuild production build injects APP_VERSION via define, but keep safe guards.
declare const process: any;
export const APP_VERSION: string =
	(typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_APP_VERSION) ||
	(typeof process !== 'undefined' && process.env && process.env.APP_VERSION) ||
	'0.6.1-WOOD-TEXTURE-FIX';
