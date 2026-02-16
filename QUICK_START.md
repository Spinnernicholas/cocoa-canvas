# Quick Start - Get Cocoa Canvas Running in 5 Minutes

**For developers who want to start coding right now.**

## Step 1: Get Docker

Cocoa Canvas runs in Docker, so you need Docker Desktop installed.

**Windows or Mac:**
1. Go to https://www.docker.com/products/docker-desktop
2. Click "Download"
3. Install it (just follow the prompts)
4. Start the Docker Desktop app

**Linux:**
```bash
sudo apt install docker.io docker-compose
```

## Step 2: Clone the Project

```bash
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas
```

## Step 3: Start Development Environment

**Windows (PowerShell):**
```powershell
./run.ps1 dev
```

**Mac or Linux:**
```bash
./run.sh dev
```

The first time takes 2-3 minutes (downloading and building). After that, it's instant.

## Step 4: Open the App

Once you see `Up` status in the logs, visit:

👉 **http://localhost:3000**

## Step 5: Create Your Admin Account

1. You'll see the setup wizard
2. Enter an email and password (this is your admin account)
3. Fill in basic campaign info (name, dates, target area)
4. Done! You're in

## Stop the App

**Windows:**
```powershell
docker-compose down
```

**Mac or Linux:**
```bash
docker-compose down
```

Or just close the terminal and press Ctrl+C.

---

## ❓ Troubleshooting

### Docker Desktop won't start?
- Try restarting your computer
- Make sure virtualization is enabled in BIOS (usually is by default)

### Port 3000 already in use?
Edit `docker-compose.yml` or `docker-compose.dev.yml`:
```yaml
ports:
  - "3001:3000"  # Change 3000 to 3001 (or any unused port)
```

### Changes not showing up?
If you edit code and changes don't appear:
- Dev mode has hot reload, but sometimes you need to refresh the browser
- If that doesn't work, stop the app and restart: `./run.ps1 dev`

### Out of disk space?
Docker can take up space. Clean up:
```bash
docker system prune -a
```

---

## 🚀 Next Steps

- Read [planning/PHASE_PLAN.md](planning/PHASE_PLAN.md) to understand what comes next
- Check [DOCKER_SETUP.md](DOCKER_SETUP.md) for more advanced options (PostgreSQL, production mode, etc.)
- Start implementing Phase 1 features! See [planning/API_PLAN.md](planning/API_PLAN.md)

## 💬 Need Help?

- Check existing GitHub issues
- Look at the planning docs in the `planning/` folder
- Ask in discussions (coming soon)

---

**That's it!** You're ready to develop. Happy coding! 🎉
