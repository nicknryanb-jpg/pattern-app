# Pattern — Life Analytics

A personal tracking app to understand yourself by monitoring how different factors affect your energy, mood, and overall well-being.

![Pattern App](https://via.placeholder.com/800x400/09090b/4a9eff?text=Pattern+App)

## Features

- **Daily Check-ins**: Quick sliders to log energy, mood, stress, and sleep quality
- **Smart Tags**: Track what's affecting you (school, sports, social, health, etc.)
- **Location Tracking**: Note where you are (useful for split households)
- **Trend Analysis**: Charts showing your metrics over time
- **Auto Insights**: Pattern detection based on your actual data
- **Export Data**: Download all your data as JSON
- **Privacy First**: All data stored locally in your browser

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Clone or download this folder
cd pattern-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

This creates a `dist` folder you can deploy anywhere.

## Working with Claude Code

To continue developing this app with Claude Code:

1. Open your terminal
2. Navigate to the project folder: `cd pattern-app`
3. Run: `claude` to start Claude Code
4. Ask Claude to make changes, add features, fix bugs, etc.

### Example prompts for Claude Code:

- "Add a reminder notification feature"
- "Create a goals/targets system"
- "Add data visualization for correlations"
- "Make the charts interactive"
- "Add a journaling feature with longer entries"
- "Create weekly/monthly summary reports"
- "Add dark/light theme toggle"

## Deployment

### Vercel (Recommended - Free)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repo
4. Deploy (auto-detects Vite)

### Netlify (Also Free)

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import your repo
4. Build command: `npm run build`
5. Publish directory: `dist`

## Project Structure

```
pattern-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx          # Main app component (all the logic)
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles + Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Charts/visualization
- **Lucide React** - Icons
- **localStorage** - Data persistence

## Future Ideas

- [ ] Cloud sync with user accounts
- [ ] Push notifications for reminders
- [ ] PWA support (installable on phones)
- [ ] Weekly email summaries
- [ ] Social sharing of insights
- [ ] Import data from other apps
- [ ] AI-powered insight generation
- [ ] Habit tracking integration

## License

MIT - do whatever you want with it.
