# ITHINK — Cognitive Training Platform

A competitive puzzle platform designed to sharpen analytical thinking through authentic, interview-grade challenges from Google, Jane Street, McKinsey, Two Sigma, Goldman Sachs, and more.

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38BDF8?style=flat&logo=tailwindcss&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logoColor=black)
![Neon](https://img.shields.io/badge/Neon_PostgreSQL-00E699?style=flat)

---

## Features

### Interactive Puzzle Types
- **Fermi Estimation** — Logarithmic slider for order-of-magnitude estimation (1 to 1 trillion), with visual range feedback after submission
- **Nim Game** — Playable stone-pile board with an optimal XOR-strategy AI opponent and live nim-sum display
- **Monty Hall Simulation** — Animated three-door probability experiment with live win-rate statistics converging to 2/3
- **LSAT Logic Games** — Full context passages with labeled multiple-choice answers
- **LogicBench** — Formal logic reasoning questions (first-order logic, default reasoning, modal logic)
- **Knights & Knaves** — Classic truth-teller/liar deduction puzzles
- **Zebra / Einstein Puzzles** — Multi-constraint grid deduction
- **Futoshiki / Takuzu / Kakurasu** — Structured grid puzzles with engine-validated solutions
- **ARC-AGI** — Abstract pattern recognition challenges

### Platform
- **XP & Leveling** — Earn XP per puzzle; bonuses for speed, penalties for hints
- **Streak tracking** — Daily active streaks with streak freezes
- **Leaderboard** — Global rankings by XP
- **Scratchpad** — Collapsible in-puzzle workspace for working through reasoning
- **Hint system** — Progressive hint reveals with XP cost
- **Timer** — Per-puzzle countdown with pause support
- **Authentication** — Email/password + Google OAuth via NextAuth v5

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, Framer Motion |
| Icons | Lucide React |
| Auth | NextAuth v5 + Drizzle Adapter |
| Database | Neon (serverless PostgreSQL) |
| ORM | Drizzle ORM |
| State | Zustand |
| Caching | Upstash Redis |
| Validation | Zod |

---

## Project Structure

```
ITHINK/
├── app/                        # Next.js application
│   ├── scripts/                # Database seeding scripts
│   │   ├── seed-all.ts         # Seeds all puzzle types
│   │   └── seed-interview.ts   # Seeds 48 interview-grade puzzles
│   └── src/
│       ├── app/                # App Router pages & API routes
│       │   ├── api/            # REST endpoints (puzzles, validate, auth)
│       │   ├── dashboard/      # User dashboard
│       │   ├── leaderboard/    # Global rankings
│       │   ├── play/[id]/      # Puzzle gameplay page
│       │   ├── profile/        # User profile
│       │   ├── puzzles/        # Puzzle browser
│       │   ├── sign-in/
│       │   └── sign-up/
│       ├── components/
│       │   ├── puzzle/         # Game components
│       │   │   ├── FermiSliderGame.tsx
│       │   │   ├── MontyHallGame.tsx
│       │   │   ├── MultiChoiceGame.tsx
│       │   │   ├── NimGame.tsx
│       │   │   ├── ScratchPad.tsx
│       │   │   └── TextPuzzleGame.tsx
│       │   ├── dashboard/
│       │   ├── landing/
│       │   └── ui/
│       ├── engines/            # Server-side puzzle validators
│       │   ├── logical-deduction/
│       │   ├── pattern-recognition/
│       │   ├── structured-grid/
│       │   └── registry.ts
│       ├── lib/
│       │   ├── auth/           # NextAuth config
│       │   ├── db/             # Drizzle schema & client
│       │   └── utils/
│       └── types/
└── data/                       # Raw puzzle datasets (used by seed scripts)
    ├── interview-grade/
    │   ├── curated-puzzles/    # 48 hand-curated interview questions
    │   └── logicbench/
    ├── logical-deduction/
    │   ├── knights-and-knaves/
    │   └── zebra/
    ├── pattern-recognition/
    │   ├── arc-agi/
    │   └── number-sequences/
    └── structured-grid/
        ├── futoshiki/
        ├── kakuro/
        └── takuzu/
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Upstash](https://upstash.com) Redis instance (optional, for caching)
- Google OAuth credentials (optional, for Google sign-in)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/ITHINK.git
cd ITHINK/app
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Database
DATABASE_URL=postgresql://...

# NextAuth
AUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Upstash Redis (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Database Setup

```bash
# Push schema to database
npm run db:push

# Seed all puzzle types
npm run seed:all

# Or seed only interview-grade puzzles
npm run seed:interview
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Puzzle Data

The `data/` directory contains the raw datasets used by the seeding scripts. All data is seeded into the PostgreSQL database — the raw files are only needed when re-seeding.

| Dataset | Source | Puzzles |
|---|---|---|
| Interview puzzles | Hand-curated | 48 (Fermi, Optimization, Probability, Game Theory, Logic) |
| Knights & Knaves | Reasoning Gym | 500 |
| Zebra puzzles | Reasoning Gym | 500 |
| LogicBench | LogicBench (Aug) | ~1,400 |
| Futoshiki | Reasoning Gym | 500 |
| Takuzu | Reasoning Gym | 500 |
| Kakurasu | Open dataset | 500 |
| Number Sequences | Reasoning Gym | 500 |
| ARC-AGI | ARC Prize | Training set |

---

## License

MIT
