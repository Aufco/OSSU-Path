# OSSU Path

A local, interactive dependency map for the [OSSU Computer Science curriculum](https://github.com/ossu/computer-science).

## Run locally

```powershell
npm install
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`). Progress is saved in the browser's `localStorage`; no account, server, or database is used.

The app separates the curriculum into two phases. Advanced CS and Final Project stay hidden until the required Core CS courses are complete. Students then build a personal elective pathway from the full checklist or apply the included Geospatial Engineer preset. Both completion progress and pathway choices persist locally.

## Refresh curriculum data

The upstream repository lives in `computer-science/`. To refresh it and regenerate the app data:

```powershell
git -C computer-science pull
npm run parse
```

The parser reads every curriculum table in the upstream README, resolves OSSU-local course pages to provider URLs, derives a `platform` field in place of Discussion, and maps recognizable prerequisite course/category names to IDs in `src/data/curriculum.json`. Ambiguous natural-language requirements are handled by reviewed curriculum rules in the parser; the original prerequisite text is always preserved.

## Production build

```powershell
npm run build
npm run preview
```

To check every generated course destination for broken responses:

```powershell
npm run audit:links
```
