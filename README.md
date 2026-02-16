# JP Complex — AI-Powered Job Parser for Indeed

> A Chrome/Firefox extension that parses Indeed job listings and uses the Gemini AI to evaluate your interview chances in real time.

## 🎥 Demo

<!-- Replace the link below with your video URL (YouTube, Loom, etc.) -->
[![Watch Demo](https://img.shields.io/badge/▶_Watch_Demo-Video-red?style=for-the-badge)](YOUR_VIDEO_LINK_HERE)

<!-- Or embed directly: -->
<!-- https://github.com/user-attachments/assets/YOUR_VIDEO_ID -->

---

## ✨ Features

### Tab 1 — Search Listings Analysis
- **Without API**: Parses all job listings from an Indeed search page and copies them to clipboard
- **With API**: Sends listings + your resume to Gemini AI and:
  - 📊 Evaluates interview chances (%) for each vacancy
  - 🏷️ Injects colored badges (green/yellow/red) directly onto the Indeed page
  - 💬 Shows detailed AI reasoning as tooltips on hover

### Tab 2 — Single Vacancy Review
- **Without API**: Extracts vacancy details (title, company, skills, description) to clipboard
- **With API**: Sends vacancy + resume to Gemini for a detailed recruiter review:
  - Interview chance assessment
  - Skills match analysis
  - Pros & cons evaluation
  - Application & interview preparation tips

### Tab 3 — Probability Collector (Manual Mode)
- Collects probability tables from Gemini pages during scrolling
- Export data as HTML or JSON
- Visual element picker for custom table selection

### ⚙️ Settings
- **API Key** — Your Gemini API key
- **Resume** — Paste your resume text for AI analysis
- **System Prompt** — Customize the AI's behavior and instructions

---

## 📸 Screenshots

<!-- Add your screenshots here -->
<!-- ![Search Analysis](screenshots/tab1.png) -->
<!-- ![Vacancy Review](screenshots/tab2.png) -->
<!-- ![Badges on Indeed](screenshots/badges.png) -->

---

## 🚀 Installation

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `manifest.json` from the `JP_complex` folder

### Chrome (Manifest V2)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **"Load unpacked"**
4. Select the `JP_complex` folder

---

## 🔑 Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API key"** → select a project
3. Copy the key and paste it into the extension settings (⚙)
4. The free tier supports ~15 requests/min and ~1500 requests/day

---

## 🛠️ Configuration

Click the ⚙ button in the extension popup to configure:

| Setting | Description |
|---------|-------------|
| **API Key** | Your Gemini API key from Google AI Studio |
| **Resume** | Your full resume text — sent to AI for analysis |
| **System Prompt** | Pre-prompt that controls AI behavior (editable) |

Toggle the **API** switch to enable/disable AI features. When API is off, the extension works as a simple parser/clipboard tool.

---

## 📁 Project Structure

```
JP_complex/
├── manifest.json              # Extension manifest (V2)
├── popup.html                 # Popup UI structure
├── popup.css                  # Popup styles (dark theme)
├── popup.js                   # Popup logic & API integration
├── background.js              # Background script (storage, downloads)
├── content_indeed_list.js     # Content script: parse search listings
├── content_vacancy.js         # Content script: parse single vacancy
├── content_probability.js     # Content script: collect probability tables
├── inject.js                  # Injected script: element picker
└── README.md                  # This file
```

---

## 🤖 Tech Stack

- **Manifest V2** — for `browser.*` API compatibility
- **Gemini 2.5 Flash** — via REST API (no SDK needed)
- **Vanilla JS/CSS** — no frameworks, no build step
- **browser.storage.local** — persistent settings & cached AI responses

---

## 📝 License

MIT — feel free to use, modify, and distribute.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.
