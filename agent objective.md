# SecPass – Secure Password Generator (Chrome Extension)
## Technical Design Document (TDD) + Project Scope (Production Plan)

**Product name (final):** SecPass – Secure Password Generator  
**Platform:** Chrome / Chromium-based browsers (Manifest V3)  
**Owner:** YuvaSec  
**Document version:** 1.0  
**Date:** 2026-01-01  

---

## 0) One-paragraph summary
SecPass is a privacy-first Chrome extension that generates **cryptographically secure passwords** locally using the Web Crypto API. Users can configure length and character sets, optionally exclude similar characters, see an entropy-based strength indicator, and copy to clipboard. The v1 release is designed to be fast, minimal-permission, offline-only, and Chrome Web Store ready.

---

## 1) Objectives

### 1.1 Primary goals ✅
- Generate strong passwords using **secure randomness** (`crypto.getRandomValues`).
- Offer a clean popup UI with the essential controls.
- Persist user preferences locally (or sync if enabled) using Chrome storage.
- Maintain **minimal permissions** and **zero network access**.
- Provide a stable v1 suitable for publishing to the Chrome Web Store.

### 1.2 Non-goals (v1) 🚫
- Password vault / storage manager
- Autofill or DOM injection into websites
- Accounts, login, telemetry/analytics
- Cloud services / server backend
- Sharing, collaboration, or team features

---

## 2) Target users & use cases

### 2.1 Users
- Everyday users who need strong passwords quickly
- Developers/testers who generate credentials frequently
- Security learners who want a transparent tool

### 2.2 Use cases
- Generate a strong password while signing up for a new service
- Quickly regenerate until password meets a site’s rules
- Copy-paste into password managers or signup forms

---

## 3) Feature scope

### 3.1 v1 (Must-have) ✅
1. **Password generation**
   - Length: 8–64 (slider)
   - Toggle sets: lowercase, uppercase, numbers, symbols
   - Optional: exclude similar characters (`I l 1 O 0`)
   - Ensure at least one character from each selected set (UX-friendly)
2. **Output + actions**
   - Readonly output field
   - Copy-to-clipboard button
   - Regenerate button
   - Toast feedback (“Copied ✅”, errors)
3. **Strength indicator**
   - Entropy estimate: `length * log2(poolSize)`
   - Labels: Weak / Okay / Strong / Very strong
4. **Preferences persistence**
   - Save toggles and length in `chrome.storage.sync` (or `local` if desired)

### 3.2 v1.1 (Should-have) ⭐
- “Exclude ambiguous symbols” option (custom symbol subset)
- “Auto-clear output after X seconds” toggle
- Keyboard shortcuts inside popup (Enter to generate, Ctrl/Cmd+C to copy)

### 3.3 v2 (Nice-to-have / future) 🧠
- Passphrase mode (wordlist-based)
- PIN generator
- Password history (local-only, clear button)
- Options page (full settings UI)
- Per-site rules (advanced; requires careful privacy design)
- Dark mode theme

---

## 4) Product requirements & constraints

### 4.1 UX constraints
- Must work in a small popup (approx. 320–360px width)
- Must function offline
- One-screen flow (no multi-step wizard for v1)

### 4.2 Security constraints
- Must use cryptographic randomness (Web Crypto)
- Must avoid modulo bias in random selection
- Must not log or transmit generated secrets
- Must keep permissions minimal

### 4.3 Performance constraints
- Instant generation (< 50ms typical)
- No background tasks required for v1 (avoid service worker unless needed)

---

## 5) Architecture (Manifest V3)

### 5.1 Extension type
- **Popup action extension** (toolbar icon opens popup)
- No content scripts in v1
- No background service worker in v1 (unless a future feature requires it)

### 5.2 High-level flow
```
User clicks icon
  → Popup loads
    → Reads saved options from storage
      → Generates password
        → Displays output + strength
          → User copies or regenerates
```

### 5.3 Components
- **UI layer:** `popup.html` + `popup.css`
- **Logic layer:** `popup.js`
- **Storage:** `chrome.storage.sync` (or `chrome.storage.local`)
- **Crypto:** Web Crypto API (`crypto.getRandomValues`)

---

## 6) File & folder structure

```
secpas-extension/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 7) Permissions & privacy

### 7.1 Permissions (v1)
- `storage` — save user preferences
- `clipboardWrite` — copy generated password

> Avoid any host permissions, network permissions, content scripts, or web requests.

### 7.2 Privacy posture
- No data collection
- No analytics
- No network calls
- User preferences only (length/toggles), stored locally/sync

---

## 8) Detailed design: password generation

### 8.1 Character sets
- Lowercase: `a-z`
- Uppercase: `A-Z`
- Numbers: `0-9`
- Symbols: a curated set (e.g. `!@#$%^&*()-_=+[]{};:,.<>/?~`)

### 8.2 Similar character exclusion
If enabled, remove: `I l 1 O 0` from the pool.

### 8.3 Rules enforcement
- If user selects multiple sets, guarantee **at least one** character from each selected set.
- Fill remaining length from the full pool.
- Shuffle the final output using Fisher–Yates with secure RNG.

### 8.4 Secure RNG implementation details
- Use `crypto.getRandomValues(Uint32Array)`
- Avoid modulo bias:
  - Calculate a `limit = floor(2^32 / max) * max`
  - Re-sample until `x < limit`
  - Return `x % max`

---

## 9) Strength meter design

### 9.1 Entropy model
```
entropyBits ≈ length × log2(poolSize)
```

### 9.2 Labels
- < 35 bits → Weak
- 35–59 → Okay
- 60–79 → Strong
- ≥ 80 → Very strong

### 9.3 UI mapping
- Progress bar width mapped from entropy (cap at 100%)

> Note: This is an estimate; do not claim “uncrackable”. Avoid misleading security claims.

---

## 10) Storage & persistence

### 10.1 Stored values
- length (number)
- booleans: lower, upper, nums, syms
- noSimilar (boolean)
- future: other toggles

### 10.2 API choice
- Use `chrome.storage.sync` for cross-device sync when available
- Consider `chrome.storage.local` if you want strictly local behavior

### 10.3 Default options
- length: 16
- lower/upper/nums: ON
- symbols: ON
- exclude similar: OFF

---

## 11) UI/UX specifications

### 11.1 Layout
- Title
- Length slider + live value
- 4 checkboxes for sets + optional toggles
- Output field + Copy button
- Strength meter + label
- Generate + Regenerate buttons
- Toast area

### 11.2 Accessibility
- All controls keyboard reachable
- Proper labels for inputs
- Clear focus styles
- High contrast for text and interactive elements

### 11.3 Error handling (UX)
- If no set selected → show toast “Select at least one character set”
- If filtered pool becomes empty (rare) → show toast and block generation

---

## 12) Quality strategy (testing)

### 12.1 Manual test checklist
- Generate with each single set (lower only, upper only, numbers only, symbols only)
- Generate with combinations (all toggles)
- Exclude similar works as expected
- Minimum length (8) and maximum (64)
- Copy works; toast appears; clipboard has correct value
- Preferences persist after closing popup and restarting browser

### 12.2 Security sanity checks
- Confirm `Math.random()` is not used
- Confirm no console logs of generated password
- Confirm no network calls in DevTools Network panel
- Confirm permissions list is minimal

### 12.3 Optional automated tests (later)
- Extract generator logic into a small module and test with a JS test runner
- Verify “at least one per set” constraints are satisfied statistically

---

## 13) Development workflow (production plan)

### Phase 0 — Repo + scaffolding
- Create repo `secpas-extension`
- Add base files: manifest, popup UI, icons placeholders
- Add README with build/run steps

### Phase 1 — Core generator + UI
- Implement secure RNG
- Implement character pool builder
- Implement generation with per-set inclusion rule
- Implement shuffle
- Wire up UI events
- Render output + strength meter

### Phase 2 — Persistence
- Implement load options on popup init
- Save on changes (slider, toggles)
- Validate defaults

### Phase 3 — Hardening & polish
- Add toast system
- Add edge-case guards (empty pool)
- Improve layout spacing and alignment
- Confirm no permission creep

### Phase 4 — Release readiness
- Finalize icons (16/32/48/128)
- Chrome Web Store assets:
  - Short description
  - Detailed description
  - 1–5 screenshots
  - Promo tile (optional)
- Draft privacy policy (simple: no data collected)
- Run final QA checklist

---

## 14) Deployment & publishing

### 14.1 Local install (dev)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the extension folder

### 14.2 Chrome Web Store (release)
- Zip the extension folder (exclude dev junk)
- Ensure manifest fields are correct
- Provide required assets and disclosures
- Submit for review

---

## 15) Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Weak RNG | Security failure | Use Web Crypto only; bias-safe selection |
| Over-permissioning | Review rejection / mistrust | Keep `storage` + `clipboardWrite` only |
| Misleading claims | Trust/legal risk | Use entropy estimate language, avoid absolutes |
| UX confusion | Low adoption | Simple defaults + clear labels |

---

## 16) Acceptance criteria (Definition of Done)

### v1.0 is “done” when:
- Password generation works with secure RNG and no modulo bias
- User can choose length and sets, and exclude similar chars
- Strength indicator updates correctly
- Copy works reliably with feedback
- Preferences persist via Chrome storage
- Extension runs with minimal permissions and no network calls
- Icons are present and display correctly
- README exists with install instructions
- Packaging is clean and store-ready

---

## 17) Roadmap

### v1.0
- Secure password generator popup (this doc)

### v1.1
- Exclude ambiguous symbols
- Auto-clear output option
- Keyboard shortcuts

### v2.0
- Passphrase + PIN
- Options page
- Local-only history

---

## 18) Appendices

### 18.1 Naming
**SecPass – Secure Password Generator**

### 18.2 Product philosophy
- Offline-first
- Transparent scope
- Minimal permissions
- Secure by default

---

**End of Document**
