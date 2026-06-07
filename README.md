<div align="center">
  <div style="background-color: #6366f1; width: 80px; height: 80px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; margin-bottom: 20px;">
    <span style="color: white; font-weight: bold; font-size: 32px; font-family: monospace;">PG</span>
  </div>
  <h1>PromptGrid</h1>
  <p><strong>A functional, minimalist prompt manager for the AI era.</strong></p>
  <p>Local-First • Native Desktop • Beautiful UI • AI Optimizer</p>

  [![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
  [![Electron](https://img.shields.io/badge/Electron-42-blue)](https://electronjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-V4-38B2AC)](https://tailwindcss.com/)
  [![Zustand](https://img.shields.io/badge/Zustand-5-brown)](https://zustand-demo.pmnd.rs/)

  <h3><a href="https://wyh.github.io/prompt-grid/">Try the Web Demo</a> | <a href="https://github.com/wyh/prompt-grid/releases/latest">Download Desktop App</a></h3>
</div>

---

## 🌟 Why PromptGrid?

In the era of Generative AI, your prompts are your most valuable assets. PromptGrid gives you a beautiful, native, and local-first environment to manage, test, and optimize them.

Inspired by the design philosophies of Linear and Notion, PromptGrid is built for speed, aesthetics, and pure productivity.

## ✨ Features

- **Local First & Privacy Focused**: Your prompts never leave your device unless you explicitly hit the "Test" button. Stored locally via IndexedDB.
- **True Desktop App**: Built on Electron for a seamless Windows/Mac native experience.
- **Dynamic Variables Playground**: Wrap any word in `{{ }}` (like `{{topic}}`) and PromptGrid automatically generates input fields to test variations!
- **AI Prompt Optimizer**: Built-in expert "Prompt Engineer" to automatically rewrite and enhance your prompts for maximum effectiveness.
- **Mac-Style Markdown & LaTeX**: Beautiful syntax highlighting, math equation rendering, and one-click copy.
- **Data Backup & Restore**: Never lose your prompts. 1-click JSON export/import.
- **Command Palette**: Hit `⌘K` to search anything instantly.
- **Dark Mode by Default**: Carefully tailored `zinc` colors with vibrant `indigo` accents.

## 🚀 Getting Started

### Download the App
Head over to the [Releases](https://github.com/wyh/prompt-grid/releases) page to download the latest `.exe` (Windows) or `.dmg` (Mac).

### Build from Source

**1. Clone the repository**
```bash
git clone https://github.com/wyh/prompt-grid.git
cd prompt-grid
```

**2. Install dependencies**
```bash
npm install
```

**3. Run the Web/Dev Version**
```bash
npm run dev
```

**4. Run the Desktop App (Dev Mode)**
```bash
npm run electron:dev
```

**5. Build the `.exe` Installer**
```bash
npm run electron:build
```
*Note: Make sure your proxy allows `electron-builder` to fetch Windows dependencies from GitHub if you're behind a firewall!*

## 🛠 Tech Stack

- **Framework**: Next.js (App Router)
- **Desktop Wrapper**: Electron + Electron-Builder
- **Styling**: Tailwind CSS V4
- **State Management**: Zustand
- **Local Database**: Dexie (IndexedDB)
- **Icons**: Lucide React
- **Markdown**: React-Markdown + Remark-Math + Rehype-Katex + React-Syntax-Highlighter

## 🤝 Contributing
Contributions are always welcome! Feel free to open an issue or submit a PR.

## 📝 License
MIT License
