# DocDrive — API Keys & Credentials Setup Guide

This document explains every environment variable the application needs, where to get it, and how to configure it.

---

## 1. PostgreSQL Database — `DATABASE_URL`

### Option A: Neon (Recommended — Free Tier)

1. Go to [https://neon.tech](https://neon.tech) and sign up
2. Click **"New Project"**
3. Enter a project name (e.g. `docdrive`) and choose a region
4. Click **"Create Project"**
5. On the dashboard, go to **Connection Details**
6. Copy the connection string — it looks like:
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
7. Paste it as:
   ```
   DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Option B: Supabase (Alternative — Free Tier)

1. Go to [https://supabase.com](https://supabase.com) and sign up
2. Click **"New Project"**
3. Set a name, password, and region
4. Go to **Settings → Database**
5. Scroll to **Connection String** → select **URI** tab
6. Copy the string (replace `[YOUR-PASSWORD]` with your actual password):
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```

---

## 2. JWT Secret — `JWT_SECRET`

Used to sign and verify authentication tokens. Must be a long random string.

### Generate it:

**Option A — Node.js (run in terminal):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Option B — PowerShell:**
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Option C — Online (use only for dev):**
Visit [https://generate-secret.vercel.app/64](https://generate-secret.vercel.app/64)

Paste the output as:
```
JWT_SECRET=your-generated-64-char-base64-string
```

---

## 3. AES Encryption Secret — `ENCRYPTION_SECRET`

Used to encrypt face embeddings stored in the database. **Must be exactly 32 characters.**

### Generate it:

**Option A — Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```
This produces exactly 32 hex characters.

**Option B — Manual:**
Type any 32-character alphanumeric string, e.g.:
```
ENCRYPTION_SECRET=aB3dEfGhIjKlMnOpQrStUvWxYz012345
```

> ⚠️ Once set and users are registered, do NOT change this value — it will break all existing face login.

---

## 4. Backblaze B2 Object Storage

Provides 10 GB free storage. All 5 variables below come from the Backblaze dashboard.

### Step 1 — Create a Backblaze Account

1. Go to [https://www.backblaze.com/b2/cloud-storage.html](https://www.backblaze.com/b2/cloud-storage.html)
2. Click **"Sign Up Free"** and create an account

### Step 2 — Create a Bucket

1. Log in and go to **B2 Cloud Storage → Buckets**
2. Click **"Create a Bucket"**
3. Set:
   - **Bucket Name:** `doc-drive-storage`
   - **Files in Bucket are:** `Private`
   - Leave all other settings as default
4. Click **"Create a Bucket"**
5. After creation, note the **Endpoint** and **Region** shown on the bucket page, e.g.:
   ```
   Endpoint: s3.us-west-004.backblazeb2.com
   Region:   us-west-004
   ```
6. Set these values:
   ```
   B2_BUCKET_NAME=doc-drive-storage
   B2_REGION=us-west-004
   B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
   ```

### Step 3 — Create Application Keys

1. In the Backblaze dashboard go to **App Keys** (under Account)
2. Click **"Add a New Application Key"**
3. Set:
   - **Name of Key:** `docdrive-key`
   - **Allow access to Bucket:** select `doc-drive-storage`
   - **Type of Access:** `Read and Write`
   - **File name prefix:** *(leave blank)*
   - **Duration:** *(leave blank for no expiry)*
4. Click **"Create New Key"**
5. **IMPORTANT:** Copy both values immediately — they are shown only once:
   - `keyID` → this is your `B2_KEY_ID`
   - `applicationKey` → this is your `B2_APPLICATION_KEY`
6. Set:
   ```
   B2_KEY_ID=0045xxxxxxxxxxxxxxxxx
   B2_APPLICATION_KEY=K005xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## 5. Admin Setup Key — `ADMIN_SETUP_KEY`

A secret passphrase you choose. Used once to promote the first registered user to admin via:
```
POST /api/admin/setup
Body: { "setup_key": "your-admin-setup-secret-key" }
```

### Set it to any strong passphrase:
```
ADMIN_SETUP_KEY=MyStr0ng!AdminKey2026
```

Keep this secret — anyone with it can promote themselves to admin.

---

## 6. Frontend Environment Variable — `NEXT_PUBLIC_API_URL`

Points the frontend to your backend API.

| Environment | Value |
|-------------|-------|
| Local dev   | `http://localhost:5000` |
| Production  | Your Render backend URL, e.g. `https://docdrive-backend.onrender.com` |

Set in `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 7. Final .env Files

### `backend/.env`
```dotenv
NODE_ENV=development
PORT=5000

DATABASE_URL=postgresql://...

JWT_SECRET=<64-char random base64>
JWT_EXPIRES_IN=30m

ENCRYPTION_SECRET=<exactly 32 chars>

B2_KEY_ID=<from Backblaze App Keys>
B2_APPLICATION_KEY=<from Backblaze App Keys>
B2_BUCKET_NAME=doc-drive-storage
B2_REGION=us-west-004
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com

BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=20
MAX_FILE_SIZE_MB=50

FRONTEND_URL=http://localhost:3000

ADMIN_SETUP_KEY=<your chosen passphrase>
```

### `frontend/.env.local`
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 8. First-Run Checklist

- [ ] PostgreSQL database created and `DATABASE_URL` set
- [ ] `JWT_SECRET` generated (64 chars)
- [ ] `ENCRYPTION_SECRET` set (exactly 32 chars)
- [ ] Backblaze B2 bucket `doc-drive-storage` created (Private)
- [ ] B2 App Key created — `B2_KEY_ID` and `B2_APPLICATION_KEY` saved
- [ ] `B2_REGION` and `B2_ENDPOINT` match your bucket region
- [ ] `ADMIN_SETUP_KEY` set to a strong passphrase
- [ ] `FRONTEND_URL` set to your frontend's URL
- [ ] Run database migration: `cd backend && npm run migrate`
- [ ] Register a user at `/register`
- [ ] Call `POST /api/admin/setup` with `ADMIN_SETUP_KEY` to make that user an admin
