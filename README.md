# Willms Reinhold Verkehrsgesellschaft – Digitale Leitstelle (SIMULATION)
Private Simulation mit fiktiven Daten. Keine Verbindung zu echten Fahrzeugen, GPS, Funk, RBL/ITCS oder Fahrplänen.

## Struktur
index.html · css/style.css · js/config.js (deine Zugangsdaten) · js/app.js · icon.png · supabase/schema.sql · supabase/seed.sql

## Einrichtung (Kurzfassung)
1. **Supabase-Projekt** auf supabase.com anlegen (Free). Region z. B. Frankfurt.
2. **SQL Editor**: erst `supabase/schema.sql`, danach `supabase/seed.sql` einfügen und ausführen.
3. **Benutzer anlegen** (Authentication → Users → Add user, E-Mail + Passwort, „Auto confirm“). Danach unter den Auth-Einstellungen die öffentliche Registrierung („Allow new users to sign up“) **ausschalten**.
4. **Freischalten**: SQL Editor: `insert into public.members select id from auth.users where email='DEINE@MAIL';` – ohne diesen Schritt sieht dein Konto keine Daten (Row Level Security).
5. **Zugangsdaten**: Project Settings → API (bzw. Data API): *Project URL* und *anon/publishable key* in `js/config.js` eintragen. **Nie** den service_role/secret Key verwenden. Der anon-Key ist für Browser gedacht; geschützt wird durch Login + RLS.
6. **Hosting**: GitHub-Konto → neues **öffentliches** Repository → alle Dateien hochladen → Settings → Pages → Branch `main`, Ordner `/ (root)`. Die Adresse lautet `https://DEINNAME.github.io/REPO/`. (Öffentliches Repo ist ok, da keine Geheimnisse enthalten sind.)
7. Falls Login-Weiterleitungen nötig sind: Authentication → URL Configuration → Site URL = deine Pages-Adresse.

## iPad-Home-Bildschirm
Safari → Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.

## 3 Monitore
In der Navigation „Monitor 1/2/3 ↗“ anklicken (öffnet neuen Tab) und das Fenster auf den jeweiligen Monitor ziehen. Alle Fenster synchronisieren sich live.

## Hinweise zum kostenlosen Tarif (Stand Recherche Okt. 2026 – bitte auf supabase.com/pricing prüfen)
- Free-Projekte pausieren nach ca. 1 Woche Inaktivität (im Dashboard wieder „Restore“). 500 MB Datenbank, 5 GB Traffic, max. 2 aktive Projekte.
- Keine garantierten Backups → regelmäßig **JSON-Export** (Menü „Datensicherung“).
- Neuere Supabase-Projekte verlangen explizite Grants für die Data API; `schema.sql` setzt sie bereits.
- Das Skript lädt `supabase-js` (Version 2.45.4) von jsDelivr; bei Problemen aktuelle Version prüfen.

## Test-Checkliste
- [ ] Login mit falschem Passwort → verständliche Fehlermeldung
- [ ] Fahrzeug anlegen/ändern/löschen (mit Bestätigung), doppelte Wagen-Nr. wird abgelehnt
- [ ] Status/Verspätung am iPad ändern → erscheint am PC ohne Neuladen; „Letzte Statusänderung“ aktualisiert
- [ ] Umlauf U2/U3 zeigt ⚠ Konflikt; nach Korrektur verschwindet er
- [ ] Ereignis anlegen → „NEU“ im Dashboard; als „erledigt“ markieren
- [ ] Suche, Filter, Sortierung, CSV-/JSON-Export, JSON-Import
- [ ] WLAN aus → „Verbindung unterbrochen“; WLAN an → „Synchronisiert“
- [ ] Hell/Dunkel; Touch-Bedienung am iPad; Abmelden → Login-Seite
