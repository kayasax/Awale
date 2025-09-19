# Changelog

All notable changes to this project will be documented in this file.

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
