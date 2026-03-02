# DocDrive 🔐

**Secure Face-Verified Cloud Document Storage Platform**

A production-ready SaaS web application with biometric authentication, admin quota management, and Cloudflare R2 cloud storage.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DocDrive Architecture                       │
├──────────────┬──────────────────┬──────────────┬────────────┤
│   Frontend   │    Backend API   │  PostgreSQL  │ Cloudflare │
│  (Next.js)   │  (Express.js)    │  (Metadata)  │   R2       │
│  Vercel      │  Render/Railway  │  Neon/Supabase│ (Files)   │
└──────────────┴──────────────────┴──────────────┴────────────┘
```

---

## Features

### User Features
- ✅ Register with Name + Face Capture + 4-digit MPIN  
- ✅ Login with Face (primary) or MPIN (fallback)
- ✅ Nested folder management
- ✅ Drag & drop file upload (no compression, no quality loss)
- ✅ Rename / Delete files and folders
- ✅ Download via 5-minute signed URLs (never exposed raw)
- ✅ Share files via secure tokenized links with optional expiry
- ✅ Storage usage progress bar (warns at 90%, blocks at 100%)
- ✅ Change MPIN
- ✅ Auto logout after 30 minutes inactivity

### Admin Features
- ✅ View all users with storage usage
- ✅ Set per-user storage quota (GB)
- ✅ Enable / Disable user accounts
- ✅ Unlock accounts after 5 failed attempts
- ✅ Storage analytics with charts
- ✅ Full audit log of all admin actions

### Security
- ✅ Face embeddings encrypted with AES-256
- ✅ MPIN hashed with bcrypt (rounds: 12)
- ✅ JWT stored in HttpOnly cookie
- ✅ CSRF protection via SameSite cookie
- ✅ Rate limiting on auth endpoints (20 req/15min)
- ✅ Account lock after 5 failed attempts
- ✅ 50MB file size limit with MIME validation
- ✅ Helmet security headers
- ✅ CORS policy
- ✅ Login history tracking

---

## Project Structure

```
DocDrive/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # PostgreSQL connection pool
│   │   ├── controllers/
│   │   │   ├── authController.js    # Register, face login, MPIN login
│   │   │   ├── fileController.js    # Upload, download, rename, delete, share
│   │   │   ├── folderController.js  # CRUD folders
│   │   │   ├── shareController.js   # Public share link access
│   │   │   └── adminController.js   # User management, analytics, logs
│   │   ├── database/
│   │   │   ├── schema.sql           # Full PostgreSQL schema
│   │   │   └── migrate.js           # Run migrations
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification, role check
│   │   │   ├── quota.js             # Storage quota enforcement
│   │   │   ├── rateLimit.js         # Rate limiters
│   │   │   ├── upload.js            # Multer + MIME validation
│   │   │   └── errorHandler.js      # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── files.js
│   │   │   ├── folders.js
│   │   │   ├── share.js             # Public endpoint
│   │   │   └── admin.js
│   │   ├── services/
│   │   │   └── r2Storage.js         # Cloudflare R2 upload/download/delete
│   │   ├── utils/
│   │   │   ├── encryption.js        # AES embedding encrypt/decrypt + cosine similarity
│   │   │   ├── jwt.js               # Sign/verify JWT
│   │   │   └── logger.js            # Winston logger
│   │   └── server.js                # Express app entry point
│   ├── .env.example
│   ├── package.json
│   └── render.yaml                  # Render deployment config
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx            # Root layout
    │   │   ├── page.tsx              # Redirect to /dashboard or /login
    │   │   ├── providers.tsx         # React Query + Auth providers
    │   │   ├── globals.css           # Tailwind + global styles
    │   │   ├── login/page.tsx        # Login (face + MPIN)
    │   │   ├── register/page.tsx     # Register with face capture
    │   │   ├── dashboard/
    │   │   │   ├── layout.tsx        # Auth guard
    │   │   │   └── page.tsx          # File manager
    │   │   ├── settings/
    │   │   │   ├── layout.tsx
    │   │   │   └── page.tsx          # Change MPIN, storage, account
    │   │   ├── admin/
    │   │   │   ├── layout.tsx        # Admin guard
    │   │   │   └── page.tsx          # Users, analytics, logs
    │   │   └── share/[token]/
    │   │       └── page.tsx          # Public file download page
    │   ├── components/
    │   │   ├── FaceCapture.tsx       # Webcam + face-api.js capture
    │   │   ├── FileCard.tsx          # File item with actions
    │   │   ├── FolderTree.tsx        # Nested folder sidebar tree
    │   │   ├── Modal.tsx             # Reusable modal
    │   │   ├── ShareModal.tsx        # Generate & copy share links
    │   │   ├── Sidebar.tsx           # App navigation sidebar
    │   │   ├── StorageBar.tsx        # Storage usage progress bar
    │   │   └── UploadZone.tsx        # Drag & drop file uploader
    │   ├── lib/
    │   │   ├── api.ts                # Axios instance with interceptors
    │   │   ├── faceApi.ts            # face-api.js model loader + embedding
    │   │   ├── utils.ts              # formatBytes, cn, etc.
    │   │   └── context/
    │   │       └── AuthContext.tsx   # Auth state + inactivity logout
    ├── .env.example
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    └── vercel.json
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Cloudflare R2 bucket
- Webcam (for face features)

### 1. Clone & Setup

```bash
# Backend
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run migrate   # Creates DB tables
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev
```

### 2. Download face-api.js Models

The frontend needs face detection models in `frontend/public/models/`.

```bash
mkdir -p frontend/public/models
```

Download these 4 model files from https://github.com/vladmandic/face-api/tree/master/model and place them in `public/models/`:

- `ssd_mobilenetv1_model-weights_manifest.json` + shard files
- `face_landmark_68_model-weights_manifest.json` + shard files  
- `face_recognition_model-weights_manifest.json` + shard files

Or run:
```bash
# Quick download script
cd frontend/public
mkdir models && cd models
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-shard1
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-shard1
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-shard1
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-shard2
```

### 3. Create Your First Admin

After registering the user you want as admin, run:

```bash
curl -X POST http://localhost:5000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-uuid", "adminSetupKey": "your-ADMIN_SETUP_KEY"}'
```

---

## Environment Variables

### Backend (.env)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32 chars, used to sign JWTs |
| `ENCRYPTION_SECRET` | Min 32 chars, AES-256 key for face embeddings |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY` | R2 API key ID |
| `R2_SECRET_KEY` | R2 API secret key |
| `R2_BUCKET_NAME` | R2 bucket name (default: doc-drive-storage) |
| `R2_ENDPOINT` | R2 endpoint URL |
| `FRONTEND_URL` | Frontend URL for CORS and share links |
| `ADMIN_SETUP_KEY` | Secret key to promote users to admin |
| `MAX_FILE_SIZE_MB` | Max upload size in MB (default: 50) |
| `BCRYPT_ROUNDS` | bcrypt rounds (default: 12) |

### Frontend (.env.local)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL |

---

## Deployment

### Backend → Render

1. Push `backend/` to a GitHub repo
2. Create new **Web Service** on Render
3. Set root directory to `backend`
4. Build: `npm install`, Start: `node src/server.js`
5. Add all environment variables from `.env.example`

### Frontend → Vercel

1. Push `frontend/` to a GitHub repo
2. Import to Vercel
3. Set `NEXT_PUBLIC_API_URL` to your Render backend URL
4. Deploy

### Database → Neon / Supabase

1. Create a PostgreSQL database
2. Copy connection string to `DATABASE_URL`
3. Run `npm run migrate` to create tables

### Cloudflare R2

1. Create an R2 bucket named `doc-drive-storage`
2. Create an API token with R2 read/write permissions
3. Set the endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
4. Add CORS policy to the bucket for your frontend domain

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with name, face, MPIN |
| POST | `/api/auth/login/face` | Login with face embedding |
| POST | `/api/auth/login/mpin` | Login with MPIN |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/change-mpin` | Change MPIN |

### Files

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/files?folder_id=...` | List files in folder |
| POST | `/api/files/upload` | Upload file (multipart/form-data) |
| GET | `/api/files/:id/download` | Get signed download URL |
| PATCH | `/api/files/:id` | Rename file |
| DELETE | `/api/files/:id` | Delete file |
| POST | `/api/files/:id/share` | Generate share link |
| GET | `/api/files/:id/shares` | List share links |
| DELETE | `/api/files/:id/shares/:shareId` | Revoke share link |

### Folders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/folders` | Get all user folders |
| POST | `/api/folders` | Create folder |
| PATCH | `/api/folders/:id` | Rename folder |
| DELETE | `/api/folders/:id` | Delete folder (cascades) |

### Sharing (Public)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/share/:token` | Get shared file info + download URL |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id/quota` | Set storage quota |
| PATCH | `/api/admin/users/:id/toggle-disable` | Enable/disable account |
| PATCH | `/api/admin/users/:id/unlock` | Unlock account |
| GET | `/api/admin/analytics` | Storage analytics |
| GET | `/api/admin/logs` | Audit logs |
| POST | `/api/admin/setup` | Promote user to admin |

---

## Security Checklist

- [x] Passwords/MPINs hashed with bcrypt (12 rounds)
- [x] Face embeddings encrypted with AES-256-CBC
- [x] JWT stored in HttpOnly, Secure, SameSite=Strict cookie
- [x] Auth rate limiting (20 req / 15 minutes per IP)
- [x] Account lock after 5 consecutive failures
- [x] File MIME type validation (whitelist)
- [x] File size limit enforced (50MB)
- [x] Storage quota enforced before upload
- [x] Raw R2 URLs never exposed (signed URLs, 5 min expiry)
- [x] Helmet security headers (CSP, X-Frame-Options, etc.)
- [x] CORS restricted to known frontend domain
- [x] All DB queries parameterized (SQL injection prevention)
- [x] User can only access their own files/folders
- [x] Admin actions require role check middleware
- [x] All admin actions logged to audit table
- [x] Login history tracked with IP and user agent
- [x] Auto logout after 30 minutes inactivity
- [x] Inactivity tracked: mousemove, keypress, scroll, click
- [ ] HTTPS enforced (Render + Vercel handle this automatically)
- [ ] Database SSL enabled in production
- [ ] Face liveness detection (advanced, optional)
- [ ] File end-to-end encryption (advanced, optional)

---

## Testing Checklist

### Authentication
- [ ] Register with valid face + MPIN → success
- [ ] Register with duplicate name → error
- [ ] Register with invalid MPIN (< 4 digits) → error
- [ ] Face login with matching face → success
- [ ] Face login with wrong face → failure, attempt counted
- [ ] Face login after 5 failures → account locked
- [ ] MPIN login with correct MPIN → success
- [ ] MPIN login with wrong MPIN → failure, attempt counted
- [ ] Change MPIN with correct current → success
- [ ] Inactivity 30min → auto logout

### Files
- [ ] Upload valid file → stored in R2, metadata in DB
- [ ] Upload file exceeding 50MB → rejected
- [ ] Upload file exceeding quota → rejected
- [ ] Download file → receives signed URL
- [ ] Rename file → name updated
- [ ] Delete file → removed from R2 + DB, quota updated
- [ ] Access another user's file → 404

### Folders
- [ ] Create root folder → success
- [ ] Create nested folder → success
- [ ] Rename folder → success
- [ ] Delete folder with files → cascades

### Sharing
- [ ] Generate share link → valid token returned
- [ ] Access share link → file info + download URL
- [ ] Access expired link → 410 Gone
- [ ] Access revoked link → 404

### Admin
- [ ] Admin can view all users
- [ ] Admin can update quota
- [ ] Admin can disable/enable user
- [ ] Admin can unlock locked account
- [ ] Non-admin cannot access admin routes
- [ ] All admin actions appear in logs

### Storage Quota
- [ ] Storage bar shows correct usage
- [ ] Warning appears at ≥90% usage
- [ ] Upload blocked at 100% usage
- [ ] Deleting file reduces storage_used

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Face Detection | face-api.js (SSD MobileNet + FaceRecognition) |
| State/Fetching | TanStack Query v5 |
| Charts | Recharts |
| Backend | Node.js, Express.js |
| Authentication | JWT (HttpOnly cookie) |
| Password/MPIN | bcrypt |
| Embedding Encryption | AES-256 (crypto-js) |
| File Upload | Multer (memory storage) |
| Object Storage | Cloudflare R2 (S3-compatible SDK) |
| Database | PostgreSQL (pg) |
| Logging | Winston |
| Rate Limiting | express-rate-limit |
| Security Headers | Helmet |

---

## License

MIT
