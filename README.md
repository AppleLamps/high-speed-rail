# California High-Speed Rail Spending Clock

A real-time spending ticker for the California High-Speed Rail project, inspired by the US Debt Clock.

![React](https://img.shields.io/badge/React-18-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Vite](https://img.shields.io/badge/Vite-5-646cff)

## Features

- **Live Spending Counter** - Real-time ticker showing cumulative project spending (~$57/second)
- **Time Tracking** - Days and years since voter approval (Nov 4, 2008)
- **Cost Comparisons** - Original $33B estimate vs current $106B-$135B projections
- **Progress Metrics** - Miles completed, Phase 1 percentage, cost per mile
- **Timeline Visualization** - Original 2020 target vs projected 2032/2039 completion
- **Accessibility** - Supports `prefers-reduced-motion` for users sensitive to animations

## Tech Stack

- React 18
- Tailwind CSS 3.4
- Vite 5

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ca-high-speed-rail-clock.git
cd ca-high-speed-rail-clock

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### Build for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ca-high-speed-rail-clock)

Or deploy manually:

```bash
npm i -g vercel
vercel
```

### Other Platforms

The `dist` folder can be deployed to any static hosting service (Netlify, GitHub Pages, Cloudflare Pages, etc.).

## Data Sources

- California High-Speed Rail Authority
- US Department of Transportation
- Federal Railroad Administration Reports (2026)

**Note:** Spending rate is estimated from public budget documents. This project is for illustration purposes only.

## License

MIT
