# Domain Recovery (nemesiscreator.com nicht erreichbar)

Wenn die Domain auf die richtige IP zeigt, aber Browser/Curl nur `connection reset` liefern, liegt das fast immer an Reverse-Proxy/Firewall/Container-Status.

## 1) Auf dem Server aktualisieren und neu deployen

```bash
cd /pfad/zu/NemesisAI
git pull
docker compose down
docker compose up -d --build
```

## 2) `.env` prüfen

Stelle sicher, dass gesetzt ist:

```env
APP_DOMAIN=nemesiscreator.com
ACME_EMAIL=deine@email.de
SESSION_SECRET=...
OPENAI_API_KEY=...
```

Dann neu starten:

```bash
docker compose up -d --build
```

## 3) Diagnose-Skript nutzen

```bash
bash script/server-diagnose.sh nemesiscreator.com
```

## 4) Firewall prüfen (DigitalOcean + UFW)

- DigitalOcean Cloud Firewall: **80/tcp** und **443/tcp** erlauben
- Falls UFW aktiv:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw status
```

## 5) DNS prüfen

`A`-Record muss auf deinen Droplet zeigen:

```bash
dig +short nemesiscreator.com A
```

Soll: `161.35.17.208` (deine aktuelle IP).

## 6) Erfolgskriterien

```bash
curl -I https://nemesiscreator.com
curl -I https://nemesiscreator.com/api/health
```

Beide sollten ohne Reset antworten (`200`/`301`/`302`).
