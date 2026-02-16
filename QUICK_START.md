# Quick Start - Get Cocoa Canvas Running in 5 Minutes

**For developers who want to start coding right now.**

## Step 1: Prerequisites

You need Node.js 22 LTS installed.

**Check if you have it:**
```bash
node --version  # Should show v22.x.x
```

**Don't have Node 22?**
- **Windows/Mac**: Download from https://nodejs.org (choose LTS version)
- **Linux**: 
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

## Step 2: Clone the Project

```bash
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Set Up Environment

Create a `.env` file for local development:

```bash
echo "DATABASE_URL=file:./data/cocoa_canvas.db
NEXTAUTH_SECRET=dev-secret-only-for-development-not-secure
NEXTAUTH_URL=http://localhost:3000" > .env
```

## Step 5: Initialize the Database

```bash
npx prisma generate
npx prisma db push
```

## Step 6: Start Development Server

```bash
npm run dev
```

The app will be running at:

👉 **http://localhost:3000**

## Step 7: Create Your Admin Account

1. You'll see the setup wizard
2. Enter an email and password (this is your admin account)
3. Fill in basic campaign info (name, dates, target area)
4. Done! You're in

## Making Changes

Now you can edit files and see changes instantly:
- Edit React components in `app/` folder
- Changes appear automatically (hot reload)
- No need to restart the server

## Stop the App

Press **Ctrl+C** in the terminal where `npm run dev` is running.

---

## ❓ Troubleshooting

### Port 3000 already in use?
Another app is using port 3000. Change it:
```bash
npm run dev -- -p 3001
```
Then visit http://localhost:3001

### Database errors?
Reset the database:
```bash
rm -rf data/cocoa_canvas.db
npx prisma db push
```

### Changes not showing up?
- Refresh your browser (sometimes needed)
- Check the terminal for errors
- If stuck, stop (`Ctrl+C`) and restart (`npm run dev`)

### Module not found errors?
Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🚀 Next Steps

- Read [planning/PHASE_PLAN.md](planning/PHASE_PLAN.md) to understand what comes next
- Check [DOCKER_SETUP.md](DOCKER_SETUP.md) for production deployment with Docker
- Start implementing Phase 1 features! See [planning/API_PLAN.md](planning/API_PLAN.md)

## 🐳 Production Deployment

For production, use Docker. See [DOCKER_SETUP.md](DOCKER_SETUP.md) for details:

```bash
docker-compose up -d
```

## 💬 Need Help?

- Check existing GitHub issues
- Look at the planning docs in the `planning/` folder
- Ask in discussions (coming soon)

---

**That's it!** You're ready to develop. Happy coding! 🎉
