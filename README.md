# Rent Score Prototype

A web-based prototype that helps renters evaluate the convenience and livability of a location based on nearby amenities and services.

The system allows users to search for an address, suburb, street, or approximate location, then generates convenience scores using nearby facilities such as shopping centres, groceries, cafes, gyms, fuel stations, pharmacies, post offices, and public transport.

This project is intended as a functional prototype rather than a production-ready platform.

**Live demo:** https://rent-score-prototype.vercel.app/

---

# Project Goals

The purpose of this prototype is to:

* Help renters quickly evaluate the convenience of a location
* Demonstrate location-based scoring using real-world map/place APIs
* Visualise nearby amenities on an interactive map
* Provide a simple and understandable scoring breakdown
* Explore how geographic data can improve rental decision-making

---

# Core Features

## MVP Features

* Search for an address or suburb
* Convert search input into geographic coordinates
* Retrieve nearby amenities from map/place APIs
* Calculate category-based convenience scores
* Display an overall location score
* Show nearby places on an interactive map
* Highlight nearby amenities as the primary result detail
* Provide compact explanations for score calculations
* Save favourite locations and compare two of them side by side
* Show additional derived indicators such as walkability, transit access, amenity density, daily convenience, and car reliance

---

# Example Categories

The scoring system evaluates convenience using categories such as:

| Category          | Example Amenities                     |
| ----------------- | ------------------------------------- |
| Shopping Centres | Shopping malls, retail hubs           |
| Groceries         | Supermarkets, grocery stores          |
| Food & Cafes      | Cafes, restaurants, bakeries          |
| Fitness & Recreation | Gyms, pools, recreation centres    |
| Transport         | Train stations, tram stops, bus stops |
| Health            | Pharmacies, clinics, hospitals        |
| Services          | Post offices, banks                   |
| Fuel & Automotive | Fuel stations                         |

---

# Example Output

```text
Shopping Centres: 78/100
Groceries: 82/100
Food & Cafes: 76/100
Transport: 65/100
Fitness: 45/100
Health: 70/100

Overall Rent Convenience Score: 72/100
```

The current UI uses a compact dashboard layout: overall and category scores are intentionally small, while nearby amenities and map context receive more space. Additional indicators appear beside the map and distinguish between values derived from the current amenity data and planned future datasets.

---

# Scoring Logic

Each category scores out of 100 from three pillars:

* **Proximity** — how close the nearest amenity is (walkable distances score highest, then a smooth decay)
* **Variety** — how many options are nearby, with diminishing returns
* **Quality** — how well the best nearby places are rated compared to what is typical for that kind of place

The overall score is a weighted average across all categories, viewed through one of two lifestyle profiles switchable in the UI: **no car** (the default — transit weighs heavily, fuel counts for nothing, and distances beyond walking range hurt sharply) or **car owner** (fuel and malls matter, distance is forgiving). The exact formulas, constants, and calibration notes live in `dev_notes.md`.

---

# Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Data & Persistence

* Prisma 6 (ORM + migrations)
* PostgreSQL on Neon (accounts, per-user history and favourites, cached score results)

## APIs & Services

* Google Places API
* Google Geocoding API
* Google Maps JavaScript API
* Transitland API (optional transport enrichment)

## Deployment

* Vercel

---

# Full-Stack Status

This is a full-stack Next.js prototype: the frontend UI, API routes, scoring/business logic, database persistence, and third-party data integrations live in one application.

Persistence is included: searches, cached score results, per-user recent-search history, authentication sessions, and starred favourite locations are stored in PostgreSQL and managed with Prisma. The hosted deployment uses Neon, while the Docker setup includes its own Postgres service. Implementation details and design rationale live in `dev_notes.md`.

Authentication is implemented with Better Auth. Users can create an email/password account or optionally sign in with Google, and saved locations and search history are scoped to the signed-in account. Passwords are hashed by Better Auth. Google sign-in never exposes the user's Google password to this application; the OAuth access and refresh tokens returned by Google are encrypted before they are stored in PostgreSQL.

It is not yet a production full-stack platform. The main missing pieces are:

* Complete account-management flows such as email verification, password reset, and account settings
* Admin tooling for managing scoring weights and category configuration outside code
* Broader application-level rate limiting for search/provider routes, plus observability, background jobs, and error tracking
* First-party or ingested datasets for rent trends, safety, schools, population density, and planning data

---

# Project Structure

```text
rent-score-prototype/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/
│   │   ├── autocomplete/
│   │   ├── compare/
│   │   ├── favourites/
│   │   ├── geocode/
│   │   ├── history/
│   │   └── places/
│   ├── components/
│   │   ├── AdditionalIndicators.tsx
│   │   ├── AuthStatus.tsx
│   │   ├── ComparePanel.tsx
│   │   ├── LocationMap.tsx
│   │   ├── NearbyPlacesList.tsx
│   │   ├── RecentSearches.tsx
│   │   ├── ScoreBreakdown.tsx
│   │   └── SearchForm.tsx
│   ├── hooks/
│   │   ├── useLocationSearch.ts
│   │   └── useSavedSearches.ts
│   ├── lib/
│   │   ├── auth.ts / auth-client.ts
│   │   ├── categories.ts
│   │   ├── db.ts
│   │   ├── scoring.ts
│   │   ├── services/
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── login/
│   ├── layout.tsx
│   └── page.tsx
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── .github/workflows/ci.yml
├── Dockerfile
├── docker-compose.yml
├── dev_notes.md
├── README.md
├── package.json
├── vitest.config.ts
├── .env (database configuration, not committed)
└── .env.local (application/API configuration, not committed)
```

---

# Development Roadmap

## Completed

* Next.js, TypeScript, Tailwind CSS, and responsive dashboard foundation
* Address autocomplete, geocoding, nearby-place retrieval, and error states
* Category scoring, lifestyle profiles, explanations, and derived indicators
* Interactive Google map, amenity-to-map linking, and return-to-row navigation
* PostgreSQL persistence with a 7-day shared result cache
* Better Auth email/password and optional Google sign-in
* Per-user recent searches, saved locations, and two-location comparison
* Vercel deployment, self-contained Docker deployment, and four-gate GitHub Actions CI
* Request cancellation/stale-response protection for autocomplete, geocoding, and nearby-place searches
* Vitest coverage for scoring, utilities, and favourite API behaviour

## Next Priorities

* Email verification, password reset, and account settings
* Broader API rate limiting, monitoring, structured logging, and error tracking
* Additional automated coverage for authentication, caching, and provider failure paths
* First-party datasets for rent, safety, schools, population, and planning signals
* Continued accessibility, responsive-layout, and mobile interaction refinement

---

# Environment Variables

Create a `.env.local` file for application and API configuration:

```env
GOOGLE_MAPS_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_MAPS_API_KEY=YOUR_PUBLIC_KEY
TRANSITLAND_API_KEY=YOUR_TRANSITLAND_KEY

BETTER_AUTH_SECRET=YOUR_RANDOM_SECRET
BETTER_AUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_OAUTH_CLIENT_SECRET
```

`TRANSITLAND_API_KEY` is optional and is used to show bus route numbers and destinations for nearby bus stops. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are also optional; email/password authentication works without Google OAuth. Generate a long random value for `BETTER_AUTH_SECRET`, keep it stable within an environment, and never commit it. Deployments that share one database must use the same secret so encrypted OAuth token material remains readable; separate development and production databases/secrets are preferred.

`NEXT_PUBLIC_MAPS_API_KEY` is exposed to the browser by design, so use a browser-restricted key. Keep `GOOGLE_MAPS_API_KEY` server-restricted. For Google OAuth, configure the local callback URL as `http://localhost:3000/api/auth/callback/google` and add the equivalent callback for every deployed domain. Google sends OAuth access and refresh tokens—not the user's Google password—back to the application, and Better Auth encrypts those tokens before database storage.

Also create a `.env` file for the database (the Prisma CLI reads `.env`, not `.env.local`). Use your Neon (or any Postgres) connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

---

# Run with Docker (no Node or Postgres needed)

The only prerequisite is [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose on Linux). The compose stack bundles the app and a Postgres database, and applies migrations automatically on startup.

```bash
git clone https://github.com/YOUR_USERNAME/rent-score-prototype.git
cd rent-score-prototype
cp .env.docker.example .env.docker   # fill in the API keys (see comments inside)
docker compose --env-file .env.docker up --build
```

Then open http://localhost:3000. Database data persists in the `db-data` Docker volume across restarts; `docker compose down -v` wipes it.

Note: `NEXT_PUBLIC_MAPS_API_KEY` is baked into the frontend at image build time, so rerun with `--build` after changing it.

---

# Installation

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/rent-score-prototype.git
cd rent-score-prototype
```

## Install Dependencies

```bash
npm install
```

## Create the Database

```bash
npm run db:migrate
```

This applies all migrations to the database in `DATABASE_URL`. To browse the data visually, run `npm run db:studio`.

For a deployed environment, apply committed migrations explicitly before releasing the application:

```bash
npm run db:migrate:deploy
```

Database deployment is intentionally separate from `npm run build`, so compiling or validating the application never changes production data. A normal Vercel build does **not** apply migrations automatically; run the deployment command deliberately against the target database before releasing schema-dependent code. The Docker Compose stack runs it through its dedicated one-shot `migrate` service automatically.

## Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Future Improvements

Potential future features include:

* Crime and safety scoring
* School quality integration
* Rental price analysis
* More detailed public transport accessibility metrics
* Walkability based on real walking routes instead of straight-line distance estimates
* Population density, suburb rent trends, schools, childcare, safety, and planned development datasets
* Email verification, password reset, and account settings
* Historical suburb trend analysis
* AI-generated suburb summaries
* Mobile-friendly optimisation

---

# Notes

This project is a prototype intended for experimentation and demonstration purposes.

The scoring system is not intended to represent official property valuations or guarantee rental quality.
