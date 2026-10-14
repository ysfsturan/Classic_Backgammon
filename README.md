# 🎲 Classic Backgammon (Tavla-ı Âlâ)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Audio API](https://img.shields.io/badge/Audio-Web_Audio_API-success)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

A beautifully crafted, authentic, web-based **Classic Backgammon** game featuring a realistic inlaid wooden board aesthetic, intelligent AI opponent, local 2-player pass-and-play, traditional dice callouts, and synthesized tactile sound effects.

---

## 🌟 Key Features / Öne Çıkan Özellikler

- **🎨 Handcrafted Wooden & Mother-of-Pearl Inlay Aesthetic:**
  - Rich walnut and mother-of-pearl wooden textures, brass hinges, corner trims, and depth shadows.
  - 3D ivory and obsidian checkers with concentric grooves and dynamic count badges for deep stacks.
  - Glowing guides for selectable checkers and legal destination points.

- **🎲 3D Animated Rolling Dice & Traditional Slang:**
  - Realistic physics-inspired roll, shake, and tumble animations.
  - Authentic Turkish/Persian dice callouts: **Hep Yek (1-1)**, **Dü Bara (2-2)**, **Dü Se (3-3)**, **Dört Cihar (4-4)**, **Dü Beş (5-5)**, **Dü Şeş (6-6)**, **Şeş Beş (6-5)**, **Penc-ü Se (5-3)**, etc.

- **🤖 Smart Heuristic AI & 👥 Local 2-Player Mode:**
  - **Novice (Easy):** Great for learning and casual play.
  - **Intermediate (Medium):** Balanced player that anchors points and hunts vulnerable blots.
  - **Master (Hard):** Advanced tactical AI utilizing deep positional heuristics: primes, escaping runners, blot protection, and home-board control.
  - **Pass-and-Play:** Play against a friend on the same screen.

- **🔊 Pure Web Audio API Synthesizer (Zero External MP3 Assets):**
  - Fully offline sound engine synthesizing tactile wood clacks, dice rattles, blot hits, bear-off sounds, and victory fanfares.

- **🛡 Complete Backgammon Rules Engine:**
  - 24-point standard international and Turkish rules.
  - Bar re-entry enforcement.
  - Legal bear-off mechanics (exact and highest-die bear off).
  - Gammon (**Mars: 2 pts**) & Backgammon (**Katmerli Mars: 3 pts**) scoring.
  - Full move history log and **Undo (Geri Al)** support.

---

## 🚀 Getting Started / Nasıl Başlatılır?

### Option 1: Direct in Browser
Simply double-click [`index.html`](index.html) to open and play in any modern web browser (Edge, Chrome, Firefox, Safari).

### Option 2: Local HTTP Server
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your web browser.

---

## 📁 Project Structure

```
classic-backgammon/
├── index.html        # Main HTML layout & board structure
├── style.css         # Inlaid wood board styling, 3D dice & animations
├── js/
│   ├── audio.js      # Web Audio API sound generator
│   ├── rules.js      # Full Backgammon game rules & move validator
│   ├── ai.js         # Heuristic AI engine (Easy, Medium, Master)
│   ├── ui.js         # DOM board renderer & interactive highlights
│   └── app.js        # Game loop controller & match manager
├── .gitignore        # Git ignore rules
└── README.md         # Documentation & guide
```

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).
