# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2024-07-13

### Added
- Image revision feature allowing users to request changes to generated images
- New "Back to Home" button for easier navigation
- Improved responsiveness for mobile devices

### Changed
- Switched image generation from Replicate to fal.ai/aura-flow for better performance and consistency
- Updated story generation prompts for more child-friendly and consistent outputs
- Refined CSS styles for better user experience and readability

### Fixed
- Type errors in generate-story.ts and revise-image.ts related to fal.ai integration
- Alignment issues with buttons in mobile view

## [1.1.0] - 2023-07-09

### Added
- Supabase integration for story storage and retrieval
- Persistent URLs for generated stories
- Image storage in Supabase
- Copy URL functionality for easy sharing

### Changed
- Updated story generation process to include image storage
- Modified story display to fetch from Supabase

### Fixed
- Issue with story persistence after generation

## [1.0.0] - 2023-07-01

### Added
- Initial release of SnugTales
- AI-powered story generation using Anthropic's Claude
- Image generation for story pages using Replicate
- Basic web interface for story creation and display
