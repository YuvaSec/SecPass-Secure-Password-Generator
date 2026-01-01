# SecPass - Secure Password Generator

A privacy-first Chrome extension that generates strong passwords locally using the Web Crypto API. No accounts, no tracking, no network calls.

## Highlights
- Secure, bias-safe randomness via `crypto.getRandomValues`.
- Configurable length (8-24) and character sets.
- Sanskrit mode: mixes Devanagari characters with Latin letters and numbers.
- Strength indicator based on entropy estimate.
- Copy to clipboard with fast feedback.
- Preferences saved in `chrome.storage.sync`.
- Offline-only with minimal permissions.

## Features
- Length slider with live value.
- Toggles: lowercase, uppercase, numbers, symbols, Sanskrit (अ), exclude similar characters.
- Generates at least one character per enabled set.
- Animated reveal for the generated password.
- Colored output for Sanskrit letters and symbols.

## Security & Privacy
- All generation happens locally.
- Uses cryptographically secure randomness (no `Math.random`).
- No analytics, no telemetry, no network access.
- Only stores preferences (length and toggles).

## Permissions
- `storage` for saving preferences.
- `clipboardWrite` for copy-to-clipboard.

## Local install (dev)
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the project folder `SecPass-Secure-Password-Generator`.

## Usage
1. Click the SecPass icon.
2. Set length and toggles.
3. Click Generate, then Copy.

## Notes
- Sanskrit mode disables other character toggles while enabled.
- Exclude similar characters stays available in all modes.

## Roadmap ideas
- Options page for advanced settings.
- Keyboard shortcuts.
- Passphrase mode.

