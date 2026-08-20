# Changelog

All notable changes to this project are documented here.

## [0.2.1] - 2026-08-20

### Changed

- Renamed the package, plugin, and project from `dsh-search` to `dsh-song-search`.
- Renamed the GitHub repository to `songoao25/dsh-song-search`.

## [0.2.0] - 2026-08-20

### Added

- Added the `dsh-song-search` plugin identity.
- Added the Search Service settings page.
- Added Exa/DeepSeek provider selection.
- Added secure API-key entry, masking, validation, cancel, and save feedback.
- Added DSH theme-token based styling and accessibility-oriented form labels.

### Changed

- Renamed the plugin from `dsh-exa-search` to `dsh-song-search`.
- Search configuration is managed from the DSH settings page.

### Security

- API keys are never logged or returned in full by the settings endpoint.
