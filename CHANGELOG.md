# Changelog

All notable changes to this project are documented here.

## [0.2.1] - 2026-08-20

### Changed

- Unified the package, plugin, and project name as `dsh-song-search`.
- Renamed the GitHub repository to `SONGOAO25/dsh-song-search`.

## [0.2.0] - 2026-08-20

### Added

- Added the `dsh-song-search` plugin identity.
- Added the Search Service settings page.
- Added Exa/DeepSeek provider selection.
- Added secure API-key entry, masking, validation, cancel, and save feedback.
- Added DSH theme-token based styling and accessibility-oriented form labels.

### Changed

- The plugin now uses the unified `dsh-song-search` identity.
- Search configuration is managed from the DSH settings page.

### Security

- API keys are never logged or returned in full by the settings endpoint.
