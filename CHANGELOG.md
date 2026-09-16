# Changelog

All notable changes to this project are documented here.

## [0.3.0](https://github.com/songoao25/dsh-song-search/compare/v0.2.1...v0.3.0) (2026-09-16)


### Features

* add popular web search providers ([#5](https://github.com/songoao25/dsh-song-search/issues/5)) ([d93f725](https://github.com/songoao25/dsh-song-search/commit/d93f725463ec84a71204c76f806621a78ade87c8))


### Bug Fixes

* make web routes recoverable across dsh restarts ([#4](https://github.com/songoao25/dsh-song-search/issues/4)) ([609d29f](https://github.com/songoao25/dsh-song-search/commit/609d29ffc61344c4bb713a6589c5c2b7e97a4e7e))

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
