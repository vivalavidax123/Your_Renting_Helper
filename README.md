# Your Renting Helper

Your Renting Helper is a personal web prototype for comparing how convenient a rental location is for everyday life. Search an Australian address or suburb to explore nearby amenities, transport access, practical services, and a compact location score.

[Open the live demo](https://rent-score-prototype.vercel.app/)

## What You Can Do

- Search Australian addresses and suburbs with autocomplete.
- Review nearby groceries, food, health, fitness, shopping, services, fuel, and transport.
- Switch between no-car and car-owner views.
- Explore category-coloured amenities on an interactive map.
- Open the map in fullscreen and follow non-transport amenities into Google Maps.
- View walkability, transit access, amenity density, daily convenience, and car-reliance indicators derived from the search result.
- Use a persistent light or dark theme.
- Create an account to keep recent searches, save locations, and compare two saved results.

## Current Scope

This is a working prototype, not an official property rating or valuation service. Results depend on third-party location data and use straight-line distance estimates rather than walking or driving routes.

The interface lists population, rent, school, safety, and planning data as planned areas only; those datasets are not currently included in the result.

## Run Locally

The recommended setup uses a separate Development configuration in the linked Vercel project.

```bash
git clone https://github.com/vivalavidax123/Your_Renting_Helper.git
cd Your_Renting_Helper
npm install
npx vercel@latest link
npx vercel@latest env pull .env.local --environment=development
npx vercel@latest env run -- npm run db:migrate:deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The Vercel pull overwrites `.env.local`. Keep any manually managed local overrides in `.env.development.local`, and never commit credentials.

Detailed environment, database, deployment, architecture, scoring, and maintenance notes are in [dev_notes.md](./dev_notes.md).

## Run with Docker

Docker Compose provides the application and a local PostgreSQL database.

```bash
cp .env.docker.example .env.docker
# Fill in the required values in .env.docker
docker compose --env-file .env.docker up --build
```

The application will be available at [http://localhost:3000](http://localhost:3000). Database data persists in the `db-data` volume. Rebuild the image after changing `NEXT_PUBLIC_MAPS_API_KEY` because browser environment values are included at build time.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check the project |
| `npm test` | Run the test suite |
| `npm run build` | Create a production build |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:migrate:deploy` | Apply committed migrations |
| `npm run db:studio` | Open Prisma Studio |

## Disclaimer

The project is intended for experimentation and rental-location comparison. Scores are indicative only and do not guarantee rental quality, safety, affordability, or suitability.
