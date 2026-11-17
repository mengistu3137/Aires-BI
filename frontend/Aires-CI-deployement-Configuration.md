
# 🏗️ 1. Architecture Overview (The Example)

- **Hosting Account:** cPanel (User: `airescad`, Base: `/home/airescad`)
- **Frontend:** React (Vite SPA)
  - Domain: `airesbi.airescommunications.com`
  - Target: `/home/airescad/airesbi`
- **Backend:** Node.js + Express + Prisma
  - Domain: `biapi.airescommunications.com`
  - Target: `/home/airescad/biapi`
- **Database:** PostgreSQL (`airescad_airesbi_db` on port `5432`)
- **Automation:** GitHub Actions + SSH (rsync deployment)

---

# 🛠️ Step 1: Prepare Domains & Folders in cPanel

1. Log into cPanel.
2. Go to **Domains**.
3. Click **Create A New Domain** and create:

   **Frontend**
   - Domain: `airesbi.airescommunications.com`
   - Document Root: `/airesbi`

   **Backend**
   - Domain: `biapi.airescommunications.com`
   - Document Root: `/biapi`

4. Check the right sidebar under **General Information** and note:

   - **System Username:** `airescad`
   - **Shared Server IP:** (e.g. `91.204.209.19`)

---

# ⚙️ Step 2: Configure the Node.js Backend Application

1. In cPanel, open **Setup Node.js App**.
2. Click **Create Application**.
3. Fill in the following:

   - **Node.js Version:** 22.x (or match your local version)
   - **Application Mode:** Production
   - **Application Root:** `biapi`
   - **Application URL:** Select `biapi.airescommunications.com`
   - **Application Startup File:** `server.js` (or `app.js`)

4. Click **Create**.
5. Note the virtual environment activation command:

```bash
source /home/airescad/nodevenv/biapi/22/bin/activate && cd /home/airescad/biapi
```

---

# 🐘 Step 3: Create PostgreSQL Database & Set `.env`

1. In cPanel, open **PostgreSQL Database Wizard**.
2. Create the database:

   - **Database Name:** `airescad_airesbi_db`
   - **Database User:** `airescad_airesbi_user`
   - **Password:** Set a strong alphanumeric password.

   > ⚠️ Avoid symbols like `;`, `(`, `)`, `@`, and `#` in database passwords unless they are properly URL-encoded in the connection string.

3. Check **ALL PRIVILEGES**.
4. Save the configuration.

### Create the `.env` file

In cPanel File Manager, navigate to:

`/home/airescad/biapi/`

Create a file named `.env` and add:

```env
# Always use 127.0.0.1 (not localhost) to avoid IPv6 issues
DATABASE_URL="postgresql://airescad_airesbi_user:YOUR_DATABASE_PASSWORD@127.0.0.1:5432/airescad_airesbi_db?schema=public"

PORT=5000
NODE_ENV=production
CLIENT_URL="https://airesbi.airescommunications.com"
```

> **Important:** Replace `YOUR_DATABASE_PASSWORD` with your actual database password. Never commit the `.env` file to GitHub.

---

# 🔐 Step 4: Generate & Authorize SSH Key in cPanel

GitHub Actions connects to the server securely over SSH to deploy the application.

1. In cPanel, open **SSH Access**.
2. Click **Manage SSH Keys**.
3. Click **Generate a New Key**.
4. Configure:

   - **Key Name:** `github_deploy`
   - **Password:** Use cPanel's Password Generator and save the password securely.
   - **Key Size:** 2048 or 4096 (RSA).

5. Click **Generate Key**.

### ⚠️ Critical: Authorize the Public Key

1. Under **Public Keys**, find `github_deploy`.
2. Click **Manage**.
3. Click **Authorize**.
4. Confirm the status shows **Authorized**.

### Download the Private Key

1. Scroll down to **Private Keys**.
2. Find `github_deploy`.
3. Click **View/Download**.
4. Copy the entire private key, including:

```text
-----BEGIN ... PRIVATE KEY-----
...
-----END ... PRIVATE KEY-----
```

Keep the private key and its passphrase secure.

---

# 🔑 Step 5: Add Secrets to GitHub Repository

1. Open your GitHub repository.
2. Navigate to:

   **Settings → Secrets and variables → Actions**
3. Click **New repository secret**.
4. Add the following secrets:

| Secret Name | Example Value | Explanation |
|---|---|---|
| `SSH_HOST` | `91.204.209.19` | Your cPanel server IP or primary domain |
| `SSH_USER` | `airescad` | Your cPanel system username |
| `SSH_PORT` | `22` | Default SSH port |
| `SSH_KEY` | Entire private key | Private SSH key copied from Step 4 |
| `SSH_PSW` | Your key password | Passphrase used when generating the SSH key |

> ⚠️ Never share these secrets publicly or commit them to your repository.

---

# 🚀 Step 6: Create the GitHub Actions Workflow

In your local project, create the following file:

```text
.github/workflows/deploy.yml
```

Add this workflow:

```yaml
name: Deploy Aires-BI to cPanel

on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      run_seed:
        description: "Run database seed?"
        type: boolean
        default: false

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: ⬇️ Checkout Repository
        uses: actions/checkout@v4

      - name: ⚙️ Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22

      # 1. Build React Frontend (Vite)
      - name: 🏗️ Build Frontend (React)
        run: |
          cd frontend
          npm install
          npm run build

      # 2. Setup & Unlock SSH Key
      - name: 🔐 Setup & Unlock SSH Key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa

          # Unlock passphrase inside runner for non-interactive rsync
          ssh-keygen -p -P "${{ secrets.SSH_PSW }}" -N "" -f ~/.ssh/id_rsa

      # 3. Deploy Frontend (dist) to cPanel
      - name: 🚀 Deploy Frontend to cPanel
        run: |
          SSH_USER_CLEAN=$(echo "${{ secrets.SSH_USER }}" | tr -d '[:space:]')

          rsync -avz --delete \
            -e "ssh -i ~/.ssh/id_rsa -p ${{ secrets.SSH_PORT }} -o StrictHostKeyChecking=no -o ConnectTimeout=30" \
            frontend/dist/ \
            "${SSH_USER_CLEAN}@${{ secrets.SSH_HOST }}:/home/${SSH_USER_CLEAN}/airesbi/"

      # 4. Deploy Backend Source to cPanel
      - name: 🚀 Deploy Backend to cPanel
        run: |
          SSH_USER_CLEAN=$(echo "${{ secrets.SSH_USER }}" | tr -d '[:space:]')

          rsync -avz --delete \
            --exclude 'node_modules' \
            --exclude '.env' \
            --exclude '.htaccess' \
            --exclude 'uploads' \
            -e "ssh -i ~/.ssh/id_rsa -p ${{ secrets.SSH_PORT }} -o StrictHostKeyChecking=no -o ConnectTimeout=30" \
            Backend/ \
            "${SSH_USER_CLEAN}@${{ secrets.SSH_HOST }}:/home/${SSH_USER_CLEAN}/biapi/"

      # 5. Remote Execution on cPanel
      - name: 🔄 Sync Schema, Migrate & Restart Node
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          passphrase: ${{ secrets.SSH_PSW }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            CURRENT_USER=$(whoami)

            source /home/${CURRENT_USER}/nodevenv/biapi/22/bin/activate
            cd /home/${CURRENT_USER}/biapi

            # Install backend packages
            npm install --omit=dev

            # Generate Prisma Client
            npx prisma generate

            # Sync Prisma Schema
            npx prisma db push --accept-data-loss

            # Run seed if requested
            if [ "${{ github.event.inputs.run_seed }}" = "true" ]; then
              node prisma/seed.js
            fi

            # Reload Passenger / Node.js
            mkdir -p tmp
            touch tmp/restart.txt
```

> ⚠️ **Database safety:** `prisma db push --accept-data-loss` can cause destructive database changes. For production, prefer reviewed Prisma migrations using `prisma migrate deploy`. Do not use `--accept-data-loss` unless you have verified the changes and have a backup.

---

# 🌐 Step 7: Important Server Rules (`.htaccess`)

## 1. Frontend SPA Routing

File location:

```text
/home/airescad/airesbi/.htaccess
```

React handles frontend routes in the browser. Add these rules so refreshing `/login` or `/dashboard` does not return a 404 error.

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    RewriteRule ^index\.html$ - [L]

    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d

    RewriteRule . /index.html [L]
</IfModule>
```

## 2. Backend Passenger Routing & CORS

File location:

```text
/home/airescad/biapi/.htaccess
```

Add:

```apache
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "/home/airescad/biapi"
PassengerBaseURI "/"
PassengerNodejs "/home/airescad/nodevenv/biapi/22/bin/node"
PassengerAppType node
PassengerStartupFile server.js
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END

# Server-Level CORS (never add a trailing slash to origin!)
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "https://airesbi.airescommunications.com"
    Header always set Access-Control-Allow-Credentials "true"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Authorization, Content-Type, Accept, X-Requested-With, Origin"
</IfModule>

RewriteEngine On
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=204,L]
```

> **Note:** Ensure your Express application handles CORS and OPTIONS preflight requests correctly. Avoid configuring conflicting CORS headers at both Apache and Express levels.

---

# ⚡ Step 8: Deploy & Test

After configuring everything, save your local changes and push them to GitHub.

### 1. Commit and Push

```bash
git add .
git commit -m "feat: setup full automated ci/cd pipeline"
git push origin main
```

### 2. Monitor GitHub Actions

1. Open your GitHub repository.
2. Click the **Actions** tab.
3. Select the latest deployment workflow.
4. Monitor each step.
5. Confirm that all steps complete successfully with green checkmarks.

### 3. Verify the Deployment

Open your frontend:

https://airesbi.airescommunications.com

Check that:

- [ ] Frontend loads successfully.
- [ ] React routes work after refreshing the browser.
- [ ] Backend API is accessible.
- [ ] PostgreSQL database connection works.
- [ ] Prisma Client is generated successfully.
- [ ] API requests work from the frontend.
- [ ] Authentication and CORS work correctly.
- [ ] GitHub Actions deployment completes successfully.

---

# 🎉 Final Result

Your Aires Business Intelligence application is deployed using an automated CI/CD pipeline.

| Component | Technology | Deployment Location |
|---|---|---|
| Frontend | React + Vite | `airesbi.airescommunications.com` |
| Backend | Node.js + Express | `biapi.airescommunications.com` |
| ORM | Prisma | Backend application |
| Database | PostgreSQL | `airescad_airesbi_db` |
| Web Server | Apache + Passenger | cPanel |
| CI/CD | GitHub Actions | Automated SSH + rsync |

**Deployment Architecture:**

```text
                 GitHub Repository
                         |
                         v
                  GitHub Actions
                         |
                  Build React App
                         |
                  Connect via SSH
                         |
             +-----------+-----------+
             |                       |
             v                       v
       Frontend Deployment    Backend Deployment
             |                       |
             v                       v
    airesbi.airescommunications.com  biapi.airescommunications.com
             |                       |
             v                       v
        React + Vite           Node.js + Express
                                     |
                                     v
                              Prisma ORM
                                     |
                                     v
                                PostgreSQL
```

**Aires BI is now ready for automated deployments whenever new changes are pushed to the `main` branch.**
