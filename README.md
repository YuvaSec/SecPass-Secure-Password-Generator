# SecPass - Secure Password Generator

A privacy-first Chrome extension that generates cryptographically secure passwords locally using the Web Crypto API.

## Local install (dev)
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `SecPass-Secure-Password-Generator` folder.

## Features (v1)
- Length slider (8–64)
- Toggle character sets + exclude similar characters
- Strength indicator (entropy estimate)
- Copy to clipboard
- Preferences saved with `chrome.storage.sync`