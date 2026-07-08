# Render Deployment - Quick Setup

## What We Fixed

✅ **Server Network Binding**: Backend now listens on `0.0.0.0` (all interfaces) instead of localhost only
✅ **API Client**: Created reusable API client with environment variable support for different deployment URLs
✅ **Environment Configuration**: Added `.env` files for both backend and dashboard
✅ **Render Configuration**: Created `render.yaml` for easy multi-service deployment
✅ **Deployment Guide**: Created `RENDER_DEPLOYMENT.md` with step-by-step instructions

## What You Need to Do

### 1. Set Up MongoDB (Required)
- Go to https://www.mongodb.com/cloud/atlas
- Create a free tier cluster
- Create a database user
- Get your connection string: `mongodb+srv://username:password@cluster...`
- Whitelist IP: 0.0.0.0 (for Render access)

### 2. Deploy Backend
- Go to https://render.com
- Create a Web Service from your GitHub repo
- Build Command: `cd server && npm install`
- Start Command: `cd server && npm start`
- Add Environment Variable:
  - `MONGODB_URI`: Your MongoDB connection string from Step 1
- Deploy and note the service URL (e.g., `https://sanction-backend.onrender.com`)

### 3. Deploy Frontend
- Go to https://render.com
- Create a Static Site from your GitHub repo
- Root Directory: `dashboard`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Add Environment Variable:
  - `VITE_API_BASE_URL`: Your backend URL from Step 2
- Deploy

### 4. Test
- Open your dashboard URL
- Try logging an infraction or processing a payment
- If it fails, check:
  1. Backend logs (Render Dashboard → Web Service → Logs)
  2. Browser console (F12 → Console tab)
  3. Network tab shows requests going to correct URL

## Local Development

```bash
# Terminal 1: Backend
cd server
npm install
npm start

# Terminal 2: Dashboard
cd dashboard
npm install
npm run dev
```

Visit http://localhost:5173 (dashboard automatically proxies /api to backend)

## File Changes Made

- `server/index.js`: Fixed server to listen on 0.0.0.0
- `server/.env`: Updated default port
- `dashboard/src/api/client.js`: New - centralized API client
- `dashboard/src/App.jsx`: Updated to use new API client
- `dashboard/.env` & `.env.example`: New - environment variables
- `render.yaml`: New - Render deployment config
- `RENDER_DEPLOYMENT.md`: New - detailed deployment guide

## Troubleshooting

See `RENDER_DEPLOYMENT.md` for detailed troubleshooting steps.

**Common issue**: "Bad Gateway"
- Check backend is running (see Render logs)
- Verify MONGODB_URI environment variable is set
- Make sure MongoDB cluster is accessible (whitelist 0.0.0.0)
