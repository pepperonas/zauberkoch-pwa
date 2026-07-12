# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt: Zauberkoch 🧑‍🍳🍸 — KI-Rezept- & Cocktail-Generator

Mobile-first Web-App unter **https://zauberkoch.de**: Nutzer wählt Modus (Kochen/Cocktail), Länderküche, Geschmacksrichtungen und Constraints in einem 3-Schritt-Wizard — die Claude-API generiert ein vollständiges Rezept, das sich **live per SSE-Streaming aufbaut** (Titel → Zutaten → Schritte). Repo: `pepperonas/zauberkoch-pwa` (privat). **Offene Selbstbedienungs-Registrierung** via Google (`OPEN_SIGNUP=true`); Allowlist bleibt als optionales Gate, falls je wieder geschlossen (`OPEN_SIGNUP=false`). Invite-Codes wurden entfernt (2026-07-12).

## Tech-Stack

| Layer | Technologie |
|---|---|
| Backend | Python 3.12, FastAPI, SQLite (WAL), SQLAlchemy 2, Pydantic v2, Alembic |
| KI | Anthropic API, Modell via env `ANTHROPIC_MODEL` (Default `claude-sonnet-5`), Streaming → semantische SSE-Events |
| Frontend | React 19, Vite, TypeScript strict, TanStack Query |
| Styling | Material 3 Expressive — **handgebaut** (Design-Tokens als CSS Custom Properties, KEIN MUI/Ant) |
| Animation | Motion (framer-motion-Nachfolger), echte Spring-Physik |
| Auth | Google OAuth 2.0 (Auth Code + PKCE, server-seitig), Sessions als httpOnly-Cookies, CSRF-Schutz |
| Deployment | VPS 69.62.121.168: systemd `zauberkoch-api` (Port **8742** loopback) + statischer Build in `/var/www/zauberkoch.de/`, vHost im zentralen nginx, certbot. **KEIN Docker.** |

## Struktur

```
backend/          # FastAPI-App (eigenes venv: backend/.venv)
  app/api/v1/     # Router (auth, recipes, favorites, shopping, share, me, health)
  app/core/       # config (pydantic-settings), security, logging
  app/models/     # SQLAlchemy: users, sessions, recipes, favorites,
                  #   shopping_list_items, generation_cache, allowlist, rate_limits
  app/schemas/    # Pydantic (u.a. Recipe — das Rezept-JSON-Schema)
  app/services/   # ai (Anthropic-Streaming + inkrementeller JSON-Parser),
                  #   cache, ratelimit, aggregation (Einkaufsliste)
  app/prompts/    # Rezept-System-Prompts, VERSIONIERT (recipe_v1.py, …) — Kernstück!
  alembic/        # Migrationen (von Anfang an; nie Schema ohne Migration ändern)
  scripts/        # Admin-CLIs: allowlist, stats, smoke_ai, showcase
  tests/          # pytest (Temp-DB, keine echten API-Calls)
frontend/         # React-App
  src/styles/     # tokens.css (M3-Schemata: Basilikum-Grün=Kochen, Violett=Cocktail, je Light+Dark)
  src/i18n/       # de.ts + t() — ALLE UI-Strings hier, nie hartcodiert in Komponenten
  src/motion/     # Spring-Presets/Transitions
  src/features/   # wizard, recipe, cook-mode, favorites, shopping, auth, landing
deploy/           # zauberkoch-api.service, nginx-vhost.conf, deploy.sh, backup-timer
docs/             # DEPLOY.md (Erst-Einrichtung), GOOGLE-OAUTH.md
```

## Befehle

```bash
# Backend (aus backend/)
source .venv/bin/activate
uvicorn app.main:app --reload --port 8742     # Dev-Server
alembic upgrade head                          # Migrationen
pytest                                        # Tests — Pflicht vor Deploy
python -m scripts.allowlist add <email>       # Allowlist verwalten
python -m scripts.stats [tage]                # Usage/Kosten/Cache-Quote/Feedback-Report
python -m scripts.smoke_ai [cocktail]         # 1 echte Generierung (Prompt/Parser-Smoke, kostet Tokens)
python -m scripts.showcase                    # Landing-Galerie seeden (idempotent, auf dem VPS)

# Frontend (aus frontend/)
npm run dev          # Vite-Dev-Server (Proxy /api → localhost:8742)
npm run build        # Production-Build
npm test             # Vitest — Pflicht vor Deploy
npx playwright test  # E2E-Smoke (lokal)

# Deploy (vom Mac)
./deploy/deploy.sh              # Tests → Build → rsync → restart → healthcheck
```

## Konventionen (verbindlich)

- **UI-Texte Deutsch**, Code/Kommentare/Commits Englisch. Strings NUR über `src/i18n/de.ts` (i18n-ready).
- **M3 Expressive handgebaut**: alle Farben/Shapes/Typo über Tokens in `tokens.css`. Moduswechsel Kochen↔Cocktail = Token-Morph (animiert), kein Neu-Rendern.
- **Motion**: echte Springs via Motion-Library — **keine linearen `ease-in-out`-CSS-Transitions als Animations-Ersatz**, keine Inline-Magic-Numbers. **MD3-Expressive-Spring-Tokens in `src/motion/tokens.ts`** (`fastSpatial`/`defaultSpatial`/`slowSpatial` mit `bounce`-Overshoot für spatial; `effectsFast`/`effectsDefault` ohne Overshoot für opacity/color; `staggerIn`, benannte Variant-Presets) — spatial darf überschwingen, Fades nie. `src/motion/springs.ts` (stiffness/damping) bleibt als älterer Satz gültig. Nur `transform`/`opacity` animieren, `will-change` gezielt. `prefers-reduced-motion` → schnelle Fades + kein Partikel-Burst, Pflicht auf jeder Animation. Aufgewertete Signatur-Animationen: **Favorit-Reward** (`FavoriteButton.tsx`), **Hero-Moment** beim Fertigwerden (`GeneratePage`: Settle-Pop + Reveal-Sweep + Haptik + Stagger), **Conjure-Stage** 264px + Atmung + rotierende Wartetexte.
- **API-Contract**: anonymes `GET /me` antwortet `200 {authenticated:false}` (nie 401 — Konsolenfehler/Lighthouse). 
- **Security**: `ANTHROPIC_API_KEY` nur server-seitig. Auth-Tokens NIE in localStorage (httpOnly-Cookies). CSRF-Schutz auf state-changing Requests. Scoring/Limits/Validierung server-seitig. CORS strikt auf zauberkoch.de.
- **Rate-Limits (2026-07-12, pro-Nutzer)**: **`User.daily_limit`** (nullable, Migration `d4e7a1b93c25`) ist das maßgebliche Tageslimit; **NULL → globaler Default `DAILY_LIMIT_PER_USER` (20)**. **Neue Konten starten bei `DEFAULT_NEW_USER_LIMIT` (int|None, Default 1)** — im Google-Callback gesetzt; Bestandsnutzer bleiben NULL (=20). `ratelimit.effective_limit(db, user_id)` löst das auf; `consume_generation`/`get_usage` nutzen es. **Admin-Panel** (`AdminPage.tsx`, restrukturiert 2026-07-12): eine Seite mit **Sticky-Sub-Nav** (IntersectionObserver-Active-State, Anker-Scroll, `top` = gemessene Header-Höhe) + 5 Sektionen — **Übersicht** (5 KPI-Cards + Trend-Sparklines für Generierungen/Kosten), **Nutzung** (pro-Nutzer Sparkline + Perioden-/Heute-Zahlen), **Nutzer & Limits** (`GET /admin/users` + `PATCH /admin/users/{id}` 0–1000|null, Stepper), **Feedback** (pro Prompt-Version, skaliert für v5+), **System** (globale Limits + Allowlist, gelabelt „nur bei OPEN_SIGNUP=false"). Sparklines = `components/admin/Sparkline.tsx` (Inline-SVG, keine Dependency). Stats-Endpoint additiv um `daily:[{day,gens,cost_usd}]` + pro-`per_user` `series:number[]` erweitert (aus den geladenen Rows gebucketet, keine Extra-Query). CSS `pages/admin.css`. Zusätzlich globaler `DAILY_LIMIT_GLOBAL`-Kostendeckel + `DAILY_LIMIT_ANON` für Probier-Zauber. **Test-Conftest** pinnt `default_new_user_limit=None`, damit Multi-Gen-Tests nicht ins 1/Tag laufen (Neu-Nutzer-Tests setzen es explizit).
- **Cache-Semantik (2026-07-12)**: Der Generation-Cache bedient nur **Erst-Anfragen** (andere Nutzer, Fehler-Retry). Wiederholt derselbe Nutzer identische Parameter, hat er das Rezept schon → Server schaltet automatisch auf `regenerate` und liefert ein **neues** Rezept. Zwei Verfeinerungen: (a) **`personen` ist aus dem Cache-Key ausgenommen** — nur-Personen-Änderung wird gratis aus dem Cache bedient und server-seitig skaliert (`_scale_recipe`); (b) Variationen bekommen die **Avoid-Liste** der bereits erhaltenen Titel (`vermeiden_titel`, server-injected, Client-Werte werden verworfen) → **Prompt v4** verhindert Beinahe-Duplikate; System-Block identisch zu v3 (Anthropic-Prompt-Cache trifft weiter).
- **Modellwahl geprüft (2026-07-11)**: `claude-sonnet-5` ist der Sweet Spot (~3–4 ct/Rezept live; Haiku spart nur ~2 ct bei sichtbarem Qualitätsverlust, Opus per `ANTHROPIC_MODEL`-Env A/B-testbar, falls Feedback-Daten es nahelegen). ⚠️ Kosten-Konstanten `PRICE_*` in `app/api/v1/admin.py` + `scripts/stats.py` = Sonnet-5-**Intro-Preise** ($2/$10) — **ab 2026-09-01 auf $3/$15 anheben**, sonst zeigt das Dashboard ~33 % zu wenig.
- **Transaktions-Mail (2026-07-12)**: `app/services/mailer.py` — Jinja2-Render (`app/templates/email/<name>.{html,txt}.j2`, HTML autoescaped, Text literal) + `smtplib` **multipart/alternative** (SMTP_SSL:465 oder STARTTLS). Env `SMTP_HOST/PORT/USER/PASS/FROM/FROM_NAME`; **leerer `SMTP_HOST` = No-Op + Warnung** (dev/tests fassen nie das Netz an). Prod nutzt den **VPS-Hostinger-Mailer** (`support@celox.io`, Anzeigename „Zauberkoch"; Creds aus `/opt/sicherheits-check-api/.env` wiederverwendbar). **Verify-Mail-Template** = dunkles Marken-Theme, bulletproof (Tabellen, Inline-Styles, VML-Button für Outlook, `color-scheme`-Meta + `[data-ogsc]`-Overrides gegen Gmail-Invertierung, Preheader, Alt-Texte, Impressum-Footer). Preview für Litmus/Mail-Tester: `python -m scripts.email_preview` → `email-preview.html` (gitignored). Der eigentliche Email/Passwort-Auth-Flow (Register/Login/Verify/Reset-Endpoints) ist noch offen — der Mailer + das Template sind die Grundlage.
- **Keine KI-Bilder** — kuratierte SVG-Motive pro Länderküche.
- **Brand-Assets (2026-07-12)**: Alle statischen Icons/Social-Images liegen in `frontend/public/` und werden aus EINEM Master-Chef-Hut-Logo (Mint-Welt, identische Geometrie zum in-App `logo`-Glyph) generiert: `npm run gen:assets` (`scripts/generate-assets.mjs`, Playwright-Chromium-Raster, kein `sharp`; ICO handgeschrieben). Output: `icon.svg`, `favicon.ico` (16/32/48), `favicon-16/32.png`, `apple-touch-icon.png` (180, **opak** — iOS rendert Transparenz schwarz), `icon-192/512.png` (purpose `any`), `icon-maskable-512.png` (**opak, Full-Bleed**, Motiv ≤80 % Safe-Zone), `og-v2.png` (1200×630). **Farb-Single-Source-of-Truth** = `COLORS`-Objekt im Script (spiegelt `tokens.css`-Mint: bg `#14531f`, Hut `#b1f0b2`, Band `#a0cfd3`, Funke `#f0b429`). Theme-Wechsel künftig = `COLORS` ändern + `npm run gen:assets`. **OG/Twitter versioniert** (`og-v2.png`, nicht `og.png` — FB/LinkedIn cachen aggressiv). Preview: `scripts/asset-preview.html` (hell+dunkel). `manifest.webmanifest`: `any`+`maskable` getrennt, `theme_color`/`background_color` = `#f7fbf1`. Die **dynamischen** per-Rezept-OG-Bilder (`/api/v1/share/…/og.png`, Backend `og_image.py`) sind davon unberührt. iOS-Splash-Screens bewusst nicht generiert.
- **PWA**: Service Worker mit versioniertem Cache `zauberkoch-vN` (aktuell **v39**) — bei jedem App-Shell-Change bumpen und Version hier nachführen. Favoriten offline lesbar.
- **Icon-System (2026-07-12)**: KEINE Emojis in der UI — alle Symbole über `<Icon name="…" size={…} />` aus `src/components/icons/` (52 Custom-SVG-Glyphen, 24×24-Grid, Registry typisiert via `IconName`; Stil-Spez `ILLUSTRATION_STYLE.md` im Repo-Root). Funktionale Icons monochrom `currentColor` (Sekundärformen per opacity), Marken-Icons `logo`/`wand` mit Tokens (`--c-primary`/`--c-tertiary`/`--icon-gold`). Größen: Nav 24 · Header-Logo 28 · Text-Buttons 18 · Inline-Stats 15–16 · Chip-Affixe 13–14 · Empty-States 48+. Region-Header-Icons stehen als `icon`-Key in `strings.cuisineRegions`. **Bewusste Ausnahme**: die ~110 Zutaten-Emojis der Kessel-Animation (`lib/zutatEmoji.ts`, `ConjureStage.tsx`) bleiben Emojis. Neue Icons: Glyph in `glyphs.tsx` + Testliste in `icons.test.ts`; QA-Galerie: `scripts/icon-gallery.tsx`.
- **Karten-Motive**: Flache Vektor-Illustrationen pro Gericht-/Glas-Typ in `RecipeMotif.tsx` (35 Kategorien × Varianten = **58 Grafiken**, deterministisch per Titel-Hash `variantFor`: 13 Glas-Typen highball/tumbler/coupe/tiki/martini/wine/flute/mule/shot/mug/beer/margarita/punch + 22 Gericht-Typen pasta/bowl/suppe/pfanne/pizza/salat/burger/fisch/steak/dessert/taco/auflauf/pancakes/sandwich/sushi/kuchen/eis/spiess/dumpling/wrap/brot; Matcher `motifForRecipe`, Cocktails matchen über das `glas`-Feld der Listen-API). Neue Motive IMMER über den Skill `.claude/skills/recipe-motifs/` erzeugen (Stil-Spezifikation + Generator-Prompt) — keine KI-Rasterbilder.
- **Dauer-Formatierung** immer über `strings.units.duration(min)` (de.ts): Min. → h → Tage („3 Tage" statt „4320 Min."). **Küchen-Chips personalisierbar**: `preferences.kuechen` (Backend-Preferences, max 40, leer = App-Defaults), Editor = `CuisineSheet` (✏️-Chip im Wizard-Schritt 1, ~110er-Katalog in `strings.cuisineRegions`, Suche + Custom-Einträge).
- **Gericht-Art (Mahlzeit-Typ, 2026-07-12)**: Kochen-Modus hat eine optionale **Gericht-Art**-Dimension (`gericht_typ`-Param, `strings.gerichtTypen` = Frühstück/Hauptgericht/Dessert/Snack/Vorspeise/Beilage/Meal-Prep) für größeres Spektrum. Analog zu `drink_typ`: optionale Chip-Reihe **über** der Küche in Wizard-Schritt 1 (Default „egal", kein neuer Schritt), fließt lowercased in **Prompt** (`recipe_v1` Kochen-Zweig, kein Versions-Bump) + **Cache-Key** (`cache_relevant`). **Persistiert**: indizierte Spalte `recipes.gericht_typ` (Alembic `c8a3d9e21f04`, aus Params gesetzt — nicht aus AI-Output; Adapt/Legacy/Überrasch = leer/unklassifiziert), in der List-API exponiert + server-seitig filterbar (`?gericht_typ=`). **Filter-Chips** (client-seitig, nur real vorhandene Typen in kanonischer Reihenfolge) in **Favoriten + Verlauf**; Galerie-Filter für v1 zurückgestellt (Feld ist ausgeliefert). **Stimmigkeit Gericht-Art × Küche (`lib/mealCompat.ts`, 2026-07-12):** zweiseitige Chip-Sperre — unstimmige Kombis (z. B. Frühstück + Pizza) sind inaktiv/ausgegraut. **Konservativ & keyword-basiert:** Länderküchen sind IMMER kompatibel (jede Kultur hat alle Gänge); nur Gericht-Form-Stile werden für eindeutig absurde Gänge gesperrt (`pizza/pasta/bbq|smoker/sushi|sashimi/tapas|pintxo/mezze` → kein Frühstück/Dessert; `ramen|nudelsupp` → kein Dessert). Keyword-Match deckt Katalog + Freitext ab; der einzige nicht-sperrbare Pfad (Freitext nach Gericht-Art-Wahl) wird per Effekt abgeräumt. `Chip` hat dafür ein `disabled`-Prop.
- **Drinks-Modus (2026-07-12)**: UI-Label heißt überall „Drinks" (Wizard, Filter, 18+-Dialog); der interne Modus-Wert bleibt `cocktail` (DB/API/Cache/Motive — NICHT migrieren). Wizard ist modusabhängig: Schritt 1 = **Drink-Typ** (`drink_typ`-Param, `strings.drinkTypes`, Freitext) statt Küche, Schritt 2 = `strings.tastesCocktail`; Küchen-Personalisierung nur im Kochen-Modus. Marketing-Wording („Rezepte & Cocktails" in Tagline/SEO) bewusst unverändert.
- **Rahmenbedingungen-Persistenz (2026-07-12)**: Die Wizard-„Feinschliff"-Diät-Flags (vegetarisch/vegan/glutenfrei/laktosefrei/proteinreich/ketogen) haben **eine Quelle = das Profil** (`me.preferences`, server-persistiert, cross-device). Die Feinschliff-Schalter **lesen aus und schreiben in** die Preferences (optimistisches `queryClient.setQueryData(['me'])` + `putPreferences`, `savePrefs()` in `GeneratePage`) — sie spiegeln also das Profil und persistieren überall; das Backend OR-merged sie ohnehin in jede Generierung (Cache-Key nutzt die gemergten Flags, Merge VOR `params_hash`). **Max-Zeit + Schwierigkeit** haben kein Profil-Äquivalent → per `localStorage` gemerkt (`zk-wiz-maxzeit`/`zk-wiz-schwierigkeit`, überleben Reload/Navigation). **Portionen** aus `standard_personen` geseedet (GeneratePage mountet erst nach `meLoading`, daher zuverlässig). KEIN lokaler Diät-`useState` mehr im Wizard (war der Bug: startete false, ignorierte das Profil, resettete bei Navigation).
- **Vorräte**: `preferences.vorraete` (Pflege im Profil-Sheet) erscheinen im Wizard-Kühlschrank-Schritt als **vorausgewählte Chips** (Tap = für diesen Lauf abwählen); keine eigene Nav-Rubrik. **Einkaufsliste hat zwei Ansichten** (Segmented, `zk-shopping-view` in localStorage): „Liste" = aggregierte Abhak-Liste, „Nach Gericht" = filterbare Rezeptliste mit aufklappbaren Zutaten + „Zutaten zur Liste" — bewusst OHNE Häkchen-Sync zwischen den Ansichten (Aggregation verschmilzt Mengen).
- **Growth-Features (2026-07-12)**: (a) **Probier-Zauber** `POST /recipes/try` (Landing, ohne Login) — Kostendeckel strikt: Cache-Hits gratis/unbegrenzt, Live nur mit 2/Tag pro IP UND globalem `DAILY_LIMIT_ANON` (env, Default 15, zählt in den Global-Deckel); nur Kochen, nichts persistiert. (b) **Invite-Codes**: 5 pro User (`GET /me/invites`, Profil-Sheet), Signup = Allowlist ODER gültiger Code (via signiertem OAuth-State-Cookie, Einmal-Nutzung). **Admin** kann zusätzlich beliebig viele Codes anlegen (`admin.py`: `GET/POST /admin/invites` Batch 1–50, `DELETE /admin/invites/{code}` nur für ungenutzte → sonst 409; `created_by`=Admin, gleiche `invites`-Tabelle). Admin-Panel-Sektion „Invite-Codes": Stepper + Erzeugen, Frisch-Banner mit Copy/„Alle kopieren", Liste mit Status (offen / eingelöst von `<email>`) + Copy/Revoke. (c) **Galerie/SEO**: `public_listed`-Opt-in im ShareDialog → `GET /share/discover` + `/share/daily` (Datums-Rotation, 0 Kosten) + dynamische `/sitemap.xml` (eigene nginx-Location). (d) **Story-Bild** `GET /share/{token}/story.png` (1080×1920). (e) **Wochenplaner** `/plan`-API + 5. Nav-Rubrik, „Woche → Einkaufsliste" über `merge_recipe_into_list`. (f) **Substitution** `POST /recipes/{id}/substitute` (Mini-Call). (g) **Sprachsteuerung** im Koch-Modus (Web Speech, „weiter/zurück/beenden"). (h) **Kühlschrank-Scan** `POST /recipes/fridge-scan` (Vision, 5/Tag/User persistent via `consume_scoped`, Client-Downscale auf 1024px).
- **Shell-Caching (2026-07-12)**: `index.html` MUSS mit `Cache-Control: no-cache` ausgeliefert werden (nginx `location = /index.html` — Header muss wegen try_files-Internal-Redirect in GENAU dieser Location stehen) und der SW holt Navigationen mit `fetch(request, {cache:'reload'})`. Ohne beides pinnt der heuristische Browser-HTTP-Cache Nutzer nach Deploys auf die alte Shell („ich sehe keinen Unterschied").
- **Interne Navigation NUR über Router-`Link`/`NavLink`** — ein echtes `<a href>` (wie früher das Header-Logo) macht einen Full-Reload und killt die laufende Generierung. Hintergrund-Indikatoren: `GenerationBar` (Balken unter dem Header) + `GenerationPill` (beide in `GenerationPill.tsx`, lazy).
- **Legal (2026-07-12)**: `/impressum`, `/datenschutz`, `/nutzungsbedingungen` (Seiten in `src/pages/legal/`, bewusst außerhalb von de.ts — einsprachige Rechtstexte), Footer-Links auf jeder Seite + Consent-Hinweis am Login. Datenschutz-Kernaussagen: nur technisch notwendige Cookies (kein Banner nötig, § 25 Abs. 2 TDDDG), Anthropic = AV mit **SCCs** (kein DPF!), Fotos werden nicht gespeichert, Konto-Löschung per E-Mail. Bei neuen Datenverarbeitungen (Tracker, neue Dritt-Dienste, neue Datenarten) MUSS die Datenschutzerklärung aktualisiert werden.
- **SEO/OG**: `index.html` trägt die Root-Meta (Description, Canonical, OG/Twitter mit statischem `/og.png`, JSON-LD WebApplication) in einem Sentinel-Block `<!-- zk:root-meta:start/end -->` — `share.py` strippt ihn auf `/r/{token}`-Seiten und ersetzt auch den `<title>` (sonst lesen Crawler die Root-Tags statt der Rezept-Tags). Das Thumbnail `frontend/public/og.png` (1200×630) wird aus der Design-Quelle `docs/og-root.html` via Headless-Chromium-Screenshot (1200×630) gerendert — bei Änderungen dort neu rendern.
- **Kein horizontaler Scroll**: `html, body { overflow-x: clip }` (base.css) + Header ist schrumpffähig (Logo-Ellipsis, enge `.shell__actions`-Gaps < 430 px). Theme-Wechsel = **Circular Reveal** über die View Transitions API (`toggleTheme(origin)` in state/app.tsx). **Mobil gefixt (2026-07-12, celox-Muster):** die Clip-Path-Animation wird **per JS auf `::view-transition-new(root)`** getrieben (`root.animate(..., {pseudoElement})`, px-Radius zur entferntesten Ecke) — NICHT über CSS-`@keyframes` mit `--vt-*`-Custom-Properties (die vererben sich auf mobilen Browsern unzuverlässig in den View-Transition-Pseudo-Baum → Reveal brach dort). base.css setzt nur `animation:none` + z-index (neu über alt). Während der Transition (`html.zk-theme-vt`) wird der **`backdrop-filter` des Headers abgeschaltet** (Per-Frame-Blur hinter animiertem Clip = mobile-GPU-Ruckelquelle); Mobile/`pointer:coarse` bekommt kürzere Dauer (520 ms vs. 900 ms). Fallback = Token-Morph (reduced-motion / keine VT-API). Moduswechsel bleibt Token-Morph.
- **Generierung ist navigationsfest**: Der SSE-Stream lebt im globalen Store `src/state/generation.ts` (außerhalb React, `useSyncExternalStore`) — NIE in Komponenten-State zurückverlagern oder beim Unmount aborten. Streaming-UX = `ConjureStage` (magischer Kessel/Shaker, event-getriebene Phasen) + globale `GenerationPill` (schwebt über der Nav, führt zur laufenden/fertigen Generierung zurück).
- **CSP beachtet**: `script-src 'self'` — KEINE Inline-Scripts in index.html (Theme-Init liegt extern in `public/theme-init.js`).
- **Tests vor Deploy**: `pytest` + `npm test` müssen grün sein; `deploy.sh` erzwingt das.
- Touch-Targets ≥ 48 px. Lighthouse-Stand (Prod, 2026-07-11): **99/100/100/100** — bei UI-Änderungen nicht darunter fallen (CLS-Falle: Footer/Lazy-Content, siehe App.css `min-height`). Footer überall: `© 2026 Martin Pfeffer | celox.io`.

## Env-Variablen

Alle in `.env.example` dokumentiert. Secrets lokal in `backend/.env`, auf dem VPS in `/opt/zauberkoch-api/.env` (mode 640) — nie committen. Google-OAuth = **eigener Client** für Zauberkoch (Redirect-URIs registriert, docs/GOOGLE-OAUTH.md).

## Deploy-Kurzform (Details: docs/DEPLOY.md)

```bash
./deploy/deploy.sh                    # kompletter Deploy
ssh root@69.62.121.168 'systemctl status zauberkoch-api'
ssh root@69.62.121.168 'journalctl -u zauberkoch-api -f'
```

nginx-vHost: `/` → `/var/www/zauberkoch.de/` (SPA-Fallback), `/api/` → 127.0.0.1:8742, **SSE-Endpoint mit `proxy_buffering off`** + langen Timeouts. `www` → 301 Apex. Backup: `zauberkoch-backup.timer` nächtlich → `/var/backups/zauberkoch/`. Infrastruktur-Gesamtdoku: `/Users/martin/CLAUDE.md`.

## KI-Framework-Pflege

Dieses Repo folgt der vollen Claude-Code-Struktur. Bei jeder relevanten Änderung prüfen, ob Updates nötig sind: `CLAUDE.md` (Stack/Befehle/SW-Cache-Version), `.claude/rules/*` (Globs & Regeln), `.claude/skills/*` (Deploy-/Release-Checklisten), `.env.example` (neue Variablen), `docs/*`.
