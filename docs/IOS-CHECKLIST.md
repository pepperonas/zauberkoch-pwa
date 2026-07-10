# iOS-Testcheckliste (C4) — manuell auf dem iPhone durchgehen

Hintergrund (Recherche 2026): Web-Push nur für installierte Home-Screen-PWAs (iOS 16.4+,
EU-Sonderfälle durch DMA), kein Background Sync, Wake Lock erst ab Safari 18.4 zuverlässig,
OAuth-Redirects aus der Standalone-PWA sind ein bekannter Stolperstein (Session-Split
zwischen PWA-Container und Safari-Tab).

## Safari (Browser)

- [ ] zauberkoch.de laden: Fonts, Farben, Theme-Toggle, Modus-Morph OK?
- [ ] Google-Login → zurück → eingeloggt?
- [ ] Rezept generieren: Streaming baut sich auf, kein Einfrieren?
- [ ] Koch-Modus: bleibt das Display an (Wake Lock)? Swipe-Navigation? Timer-Vibration?
- [ ] Teilen-Dialog: natives Share-Sheet erscheint, Link-Vorschau in iMessage/WhatsApp zeigt OG-Bild?

## Installierte PWA (Teilen → Zum Home-Bildschirm)

- [ ] App startet standalone (ohne Safari-UI), Safe-Areas korrekt (Notch/Home-Indicator)?
- [ ] **Kritisch:** Google-Login AUS der installierten PWA — landet man danach eingeloggt
      wieder in der PWA (nicht in einem separaten Safari-Tab)? Falls Session-Split:
      als Issue notieren → Workaround wäre ein „In Safari öffnen"-Hinweis vorm Login.
- [ ] Offline-Test: Flugmodus → App öffnen → Favoriten lesbar?
- [ ] Nach Deploy (SW-Bump): App zweimal öffnen → neue Version aktiv?

## Ergebnis

Findings hier eintragen oder als GitHub-Issues anlegen; erst danach über Web-Push o.ä. entscheiden.
