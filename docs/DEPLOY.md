# Deploy — zauberkoch.celox.io

**Status: noch nicht eingerichtet.** Diese Datei beschreibt die geplante Erst-Einrichtung; nach dem Setup hier die tatsächlichen Werte dokumentieren (Muster: xword/xchange).

## Ziel-Setup (VPS 69.62.121.168)

| Komponente | Wert |
|---|---|
| Frontend-Webroot | `/var/www/zauberkoch.celox.io/` |
| Backend | `/opt/zauberkoch-api/` (systemd `zauberkoch-api`, Port **4251** loopback) |
| Daten | `/opt/zauberkoch-api/data/` (SQLite, von Backup-Timer erfasst) |
| Secrets | `/opt/zauberkoch-api/.env` (mode 640, nie committen) |
| nginx | eigener Server-Block, `/api/` → `127.0.0.1:4251`, SPA-Fallback `try_files` |
| TLS | Let's Encrypt via Certbot |
| DNS | A-Record `zauberkoch.celox.io → 69.62.121.168` (Hostinger) |

Port 4251 ist der nächste freie im 424x/425x-Schema (4250 = pkmn-battle).

## Erst-Einrichtung (Checkliste)

1. DNS-A-Record bei Hostinger anlegen
2. Webroot + `/opt/zauberkoch-api/` anlegen, `.env` erzeugen (mode 640)
3. systemd-Unit `zauberkoch-api.service` installieren (liegt nach Erstellung im Repo unter `server/`)
4. nginx-Block anlegen, `nginx -t && systemctl reload nginx`
5. Certbot: `certbot --nginx -d zauberkoch.celox.io`
6. Backup-Timer für die SQLite-DB einrichten (Muster: `xword-backup.timer` → `/var/backups/zauberkoch/`)
7. Deploy-Befehle aus `CLAUDE.md` ausführen und verifizieren

## Regel-Deploy

Siehe `CLAUDE.md` → Abschnitt „Deploy". Vor jedem Deploy: Tests grün, bei App-Shell-Änderungen SW-Cache-Version bumpen.
