# Changelog

All notable changes to this project will be documented in this file.

## [0.6.1] - 2025-09-23
### Fixed
- Wood theme texture 404 on GitHub Pages by correcting relative CSS path (`./textures/wood.jpg` → `../textures/wood.jpg`) due to build output nesting (`assets/style.css`).

## [0.4.0] - 2025-09-23
### Added
- Ambient visual atmosphere system: subtle dust motes, floating seeds, fireflies (with adaptive luminance and fullscreen support).
- Particle layer management with mood/event hooks (move-made, capture, game-start/end).
- Wood theme pit carving refinements and texture integration improvements.
- Resilience features: ResizeObserver-based canvas sizing, fullscreen promotion helper, persistent ambient reseeding.
### Changed
- Reduced console verbosity with tiered debug levels and on-demand visibility boost.
- Balanced particle opacity and size for dark wood contrast.
### Fixed
- Canvas sizing sticking at initial small dimensions; now settles and tracks container expansion.
- Intermittent loss of baseline ambient layers after hot reload.

## [0.2.0] - 2025-09-19
### Added
- Animated sowing sequence with hand indicator; immediate audio feedback per seed.
- Capture sparkle visual effects and delta gain/loss indicators.
- Wood theme styling; unified scenic background across themes.
- Accessibility improvements: aria-live announcements, improved pit labeling.
- Footer with dynamic version, author and repository link.
- Dynamic build-time version injection via esbuild define.
- Favicon SVG icon.

### Changed
- Removed intrusive AI overlay; replaced with subtle status messaging.
- Consolidated background handling (removed wood-specific duplication).

### Fixed
- Build failure caused by unresolved background image path by marking asset external and refactoring background application.
- Image layering glitch between themes.

## [0.1.0] - 2025-09-??
### Added
- Initial playable Awale/Oware implementation with greedy AI.
- Basic React/TypeScript UI and custom esbuild production bundler.
