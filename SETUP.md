# Setup Guide — Fedora 43 KDE Plasma

Complete step-by-step guide to run DalaliMkononi Backend on Fedora 43.

---

## 1. Install System Dependencies

Open **Konsole** (or any terminal) and run:

```bash
# Update system packages
sudo dnf update -y

# Install Node.js 20 (LTS) from Fedora repos
sudo dnf install -y nodejs npm

# Install PostgreSQL 16 (server + client)
sudo dnf install -y postgresql-server postgresql-contrib

# Install Git (if not already installed)
sudo dnf install -y git
```

### Verify installations:

```bash
node --version   # Should print v20.x.x or higher
npm --version    # Should print 10.x.x or higher
psql --version   # Should print psql (PostgreSQL) 16.x
```

---

## 2. Initialize PostgreSQL Database

### Step 2.1 — Initialize the data directory (first-time only)

```bash
sudo postgresql-setup --initdb
```

### Step 2.2 — Start and enable PostgreSQL service

```bash
# Start now
sudo systemctl start postgresql

# Enable auto-start on boot
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### Step 2.3 — Create the database and user

```bash
# Switch to postgres user
sudo -u postgres psql
```

Inside the `psql` prompt, run:

```sql
-- Create a database user for the app
CREATE USER dalali WITH PASSWORD 'your_db_password';

-- Create the database
CREATE DATABASE dalali OWNER dalali;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dalali TO dalali;

-- Exit psql
\q
```

> **Tip:** Replace `your_db_password` with a secure password. You'll need it in the `.env` file.

---

## 3. Clone the Project

```bash
# Choose your workspace folder
cd ~/Documents

# Clone the repository
git clone https://github.com/chifie/DalaliMkononi_Backend.git

# Enter the project folder
cd DalaliMkononi_Backend
```

---

## 4. Install Node.js Dependencies

```bash
npm install
```

This installs: Express, pg (PostgreSQL driver), bcryptjs, jsonwebtoken, helmet, cors, morgan, express-rate-limit, express-validator, dotenv.

---

## 5. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Now edit `.env` with your favorite editor. In KDE you can use **Kate**:

```bash
kate .env
```

Or with **nano** in the terminal:

```bash
nano .env
```

Update the values:

```env
PORT=3001
NODE_ENV=development

# Replace with your actual PostgreSQL credentials
DATABASE_URL=postgresql://dalali:your_db_password@localhost:5432/dalali

# Generate a strong secret (run: openssl rand -base64 32)
JWT_SECRET=replace-this-with-a-strong-secret-key
JWT_EXPIRES_IN=7d

# Your frontend URL (or leave as-is for local dev)
FRONTEND_URL=http://localhost:8080
CORS_ORIGINS=http://localhost:8080,http://localhost:3001
```

> **Generate a strong JWT secret:**
> ```bash
> openssl rand -base64 32
> ```
> Copy the output and paste it as your `JWT_SECRET`.

Save the file (`Ctrl+S` in Kate, or `Ctrl+O` then `Ctrl+X` in nano).

---

## 6. Run Database Migrations

```bash
npm run db:migrate
```

You should see output like:

```
✅  001_initial_schema.sql
✅  003_seed_data.sql

🎉  All migrations completed successfully!
```

---

## 7. Start the Server

### Development mode (auto-reload on file changes):

```bash
npm run dev
```

### Production mode:

```bash
npm start
```

You should see:

```
🚀  DalaliMkononi API running on port 3001 [development]
    Health check: http://localhost:3001/health
```

---

## 8. Test the API

Open a **new terminal tab** and test the health endpoint:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"status":"ok","timestamp":"2026-06-20T..."}
```

Test login with a demo account:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"asha@dalali.tz","password":"tenant123"}'
```

---

## 9. Useful Commands (Keep Handy)

| Command | What it does |
|---|---|
| `sudo systemctl start postgresql` | Start PostgreSQL |
| `sudo systemctl stop postgresql` | Stop PostgreSQL |
| `sudo -u postgres psql -d dalali` | Connect to database |
| `npm run db:migrate` | Re-run all migrations |
| `npm run dev` | Start server (dev mode) |
| `npm start` | Start server (production) |

---

## Troubleshooting

### "password authentication failed"

Edit PostgreSQL config to allow local password auth:

```bash
sudo nano /var/lib/pgsql/data/pg_hba.conf
```

Find the line:

```
local   all             all                                     peer
```

Change `peer` to `md5`:

```
local   all             all                                     md5
```

Save and restart:

```bash
sudo systemctl restart postgresql
```

### "database 'dalali' does not exist"

Re-run the database creation steps in **Step 2.3**.

### "port 3001 already in use"

Either stop the other process or change `PORT` in `.env` to another port (e.g., `3002`).

### "Cannot find module 'pg'"

Re-run:

```bash
npm install
```

---

## Next Steps

- [Integrate with your frontend](README.md)
- [Deploy to Railway/Render](https://render.com/docs/deploy-node-express-app)
- [Set up SSL/HTTPS](https://certbot.eff.org/)
