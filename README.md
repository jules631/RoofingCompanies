# RoofPing

**AI-powered first impression agent for roofing owner-operators.**

RoofPing ensures every homeowner inquiry gets an instant, professional SMS response within 60 seconds — even when the rep is on the job site.

---

## The Problem

Homeowners shopping for a roofer are making a trust decision under stress. They submit to multiple companies and choose whoever responds first *and* sounds most professional. Roofing owner-operators miss this window constantly. RoofPing closes the response gap automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│              Next.js + Tailwind (Vercel)                    │
│                                                             │
│  /           → Lead capture form (homeowner-facing)         │
│  /dashboard  → Rep dashboard (mobile-first)                 │
│  /leads/[id] → Lead detail + event timeline                 │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP (fetch)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API                            │
│               Node.js + Express (Railway)                   │
│                                                             │
│  POST /api/leads              → Create lead + enqueue jobs  │
│  GET  /api/leads              → List all leads              │
│  GET  /api/leads/:id          → Lead detail + events        │
│  PATCH /api/leads/:id/contacted → Cancel pending messages   │
│  POST /api/webhooks/twilio/inbound → Handle homeowner reply │
└──────┬──────────────────┬────────────────────────┬──────────┘
       │                  │                        │
       ▼                  ▼                        ▼
┌──────────────┐  ┌───────────────┐  ┌────────────────────────┐
│  PostgreSQL  │  │  Upstash      │  │  Twilio Messaging API  │
│  (Supabase)  │  │  Redis/BullMQ │  │  Inbound + Outbound    │
└──────────────┘  └───────┬───────┘  └────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   BullMQ Worker       │
              │   (separate process   │
              │    on Railway)        │
              │                       │
              │  Job 1: Instant SMS   │
              │  Job 2: 24hr follow-up│
              │  Job 3: 48hr follow-up│
              │  Job 4: 6hr rep alert │
              └───────────────────────┘
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase account (free tier)
- An Upstash Redis account (free tier)
- A Twilio account with a phone number

### 1. Clone and install

```bash
git clone <repo-url>
cd roofping

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. In your project, go to **SQL Editor** → New Query
3. Paste the contents of `backend/src/db/schema.sql` and run it
4. Go to **Settings → Database** and copy the **Connection string** (URI format)
   - It looks like: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
5. Insert your company record:
   ```sql
   INSERT INTO companies (name, twilio_number, rep_phone)
   VALUES ('Your Roofing Co', '+15551234567', '+15559876543');
   ```

### 3. Set up Upstash Redis

1. Go to [upstash.com](https://upstash.com) → Create Database → Redis
2. Select **Global** or the region closest to your backend
3. Copy the **Redis URL** (TLS format, starts with `rediss://`)

### 4. Set up Twilio

1. Go to [twilio.com](https://twilio.com) → get a phone number
2. Copy your **Account SID** and **Auth Token** from the Console Dashboard
3. You will configure the webhook URL after setting up ngrok (see below)

### 5. Configure environment

```bash
cp .env.example backend/.env
```

Fill in all values in `backend/.env`:

| Variable | Where to find it |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Console → Dashboard |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Dashboard |
| `TWILIO_PHONE_NUMBER` | Twilio Console → Phone Numbers |
| `COMPANY_NAME` | Your business name |
| `REP_PHONE_NUMBER` | Your cell number for alerts |
| `DATABASE_URL` | Supabase → Settings → Database → URI |
| `REDIS_URL` | Upstash → Database → Redis URL (TLS) |
| `PORT` | `3001` (default) |

For the frontend, create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 6. Run locally (3 processes)

Open three terminal tabs:

**Tab 1 — API Server**
```bash
cd backend
npm run dev
# Running on http://localhost:3001
```

**Tab 2 — BullMQ Worker**
```bash
cd backend
npm run dev:worker
# RoofPing message worker started
```

**Tab 3 — Frontend**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

### 7. Expose webhook for Twilio (ngrok)

Twilio needs a public URL to send inbound SMS notifications.

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3001
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`) and go to:
- Twilio Console → Phone Numbers → Your number → Messaging
- Set **"A message comes in"** webhook to:
  `https://abc123.ngrok.io/api/webhooks/twilio/inbound`
- Method: **HTTP POST**

---

## Deployment

### Backend + Worker on Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add **two services** (both pointing to the same repo):

   **Service 1 — API Server**
   - Root directory: `backend`
   - Start command: `node src/index.js`

   **Service 2 — Worker**
   - Root directory: `backend`
   - Start command: `node src/workers/messageWorker.js`

4. Add environment variables (same as `.env`) to **both** services
5. Railway will give your API service a public URL — note it

### Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo, set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-api-url.railway.app
   ```
4. Deploy

### Twilio Webhook (Production)

Update your Twilio phone number webhook URL to your Railway API URL:
```
https://your-api.railway.app/api/webhooks/twilio/inbound
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio auth token (kept secret) |
| `TWILIO_PHONE_NUMBER` | Yes | Your Twilio phone number in E.164 format |
| `COMPANY_NAME` | Yes | Displayed in homeowner SMS messages |
| `REP_PHONE_NUMBER` | Yes | Rep's cell number for escalation alerts |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Upstash Redis TLS URL |
| `PORT` | No | API server port (default: 3001) |
| `FRONTEND_URL` | No | Restrict CORS to this domain in production |
| `NEXT_PUBLIC_API_URL` | Yes (frontend) | API base URL for frontend to call |

---

## End-to-End Test Checklist

Run through these with real Twilio credentials on a deployed environment:

- [ ] **Submit form** → SMS received on homeowner phone within 60 seconds
- [ ] **Lead appears in dashboard** with stage "acknowledged" (or "nurturing" after SMS sent)
- [ ] **Reply to SMS** from homeowner phone → sequence pauses, rep gets notification SMS
- [ ] **Click "Mark Contacted"** → stage updates to green, no further messages sent to homeowner
- [ ] **Wait 6 hours** (or set delay to 10 seconds in dev) → rep escalation SMS received with lead details

---

## Key Design Decisions

### Job Cancellation (Critical)
When a rep marks a lead as "contacted", all pending BullMQ jobs are removed via `job.remove()` AND the database rows are marked `cancelled`. The worker also checks sequence status before sending — providing a double safety net against messages sent after contact.

### Database Transactions
Lead creation uses a PostgreSQL transaction. If job enqueueing fails, the lead record is rolled back, preventing orphaned leads with no message sequence.

### Twilio Webhook Validation
All inbound Twilio requests are validated using `twilio.validateRequest()`. Invalid signatures return 403 — preventing spoofed webhook calls.
