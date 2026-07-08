# 🟢 Render Deployment - Step-by-Step

## Prerequisites

- [ ] GitHub repository with code pushed
- [ ] MongoDB Atlas cluster created (already done)
- [ ] Render account created at https://render.com

---

## Part 1: Deploy Backend

### Step 1.1: Create Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** in top right
3. Select **"Web Service"**
4. Click **"Connect"** next to your GitHub repository
5. (If not authorized, click "Connect account" first)

### Step 1.2: Configure Build Settings

| Field | Value |
|-------|-------|
| **Name** | `sanction-backend` |
| **Environment** | `Node` |
| **Region** | `(Select nearest to you)` |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` (change to Starter if you need 24/7) |

Click **"Create Web Service"**

### Step 1.3: Wait for Initial Deployment

- You'll see logs streaming
- Wait for deployment to complete (may take 2-3 minutes)
- **Note the service URL** (appears at top, e.g., `https://sanction-backend.onrender.com`)

### Step 1.4: Add Environment Variables

1. Go to **"Settings"** tab (next to Logs)
2. Scroll to **"Environment"** section
3. Click **"Add Environment Variable"** (plus button)

**Add these variables:**

| Key | Value |
|-----|-------|
| `PORT` | (Leave empty or delete - Render auto-assigns) |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://ned:jp@cluster0.kdgy8kh.mongodb.net/Admin-SchoolOrg?retryWrites=true&w=majority&appName=Cluster0` |

4. Click **"Save Changes"** (at bottom right)

### Step 1.5: Deploy with Environment Variables

1. Go back to **"Logs"** tab
2. Click **"Manual Deploy"** button (right side)
3. Select **"Deploy latest commit"**
4. Wait for deployment

**Expected Output in Logs:**
```
=== Running build command: npm install ===
added X packages
=== Running start command: npm start ===
MongoDB Connected successfully to: mongodb+srv://ned:jp@cluster0.kdgy8kh.mongodb.net/Admin-SchoolOrg...
Express Sanction Backend running on port 10000
```

### Step 1.6: Verify Backend is Running

1. Copy your service URL (e.g., `https://sanction-backend.onrender.com`)
2. Open in browser: `https://sanction-backend.onrender.com/api/state`
3. Should see JSON response with members, ledger, rules

**Note this URL - you'll need it for the dashboard!**

---

## Part 2: Deploy Dashboard

### Step 2.1: Create Static Site

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Static Site"**
3. Click **"Connect"** next to your GitHub repository
4. (Select same repository as backend)

### Step 2.2: Configure Build Settings

| Field | Value |
|-------|-------|
| **Name** | `sanction-dashboard` |
| **Environment** | (Default) |
| **Region** | `(Same as backend)` |
| **Branch** | `main` |
| **Root Directory** | `dashboard` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

Click **"Create Static Site"**

### Step 2.3: Add Environment Variable

1. Go to **"Settings"** tab
2. Scroll to **"Environment"** section
3. Click **"Add Environment Variable"**

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://sanction-backend.onrender.com` |

(Replace with YOUR backend URL from Step 1.6)

4. Click **"Save Changes"**

### Step 2.4: Deploy with Environment Variable

1. Go to **"Logs"** tab
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment

**Expected Output:**
```
=== Running build command: npm install && npm run build ===
vite v5.4.10 building for production...
✓ X modules transformed
dist/index.html   5.25 kB │ gzip: 1.86 kB
dist/assets/...

Deployment successful!
```

### Step 2.5: Get Dashboard URL

The dashboard URL appears at the top of the Settings page. It looks like:
```
https://sanction-dashboard.onrender.com
```

---

## Part 3: Test Full Integration

### Step 3.1: Open Dashboard

1. Go to your dashboard URL: `https://sanction-dashboard.onrender.com`
2. You should see the dashboard with the member list loaded

### Step 3.2: Test Create Member (Optional)

If testing requires member creation, data should load from MongoDB.

### Step 3.3: Test Infraction

1. Select a member
2. Enter event type and description
3. Click "Record Infraction"
4. Should see success message
5. Balance should increase in member list

### Step 3.4: Test Payment

1. Click "Process Payment"
2. Enter amount and select payment type
3. Click "Process Payment"
4. Should see success message
5. Balance should decrease

### Step 3.5: Check Browser Console

If anything fails:
1. Open DevTools: F12
2. Go to **Console** tab
3. Look for error messages
4. Check **Network** tab to see API requests

---

## Troubleshooting

### Backend Won't Deploy

**Error: "MongoDB connection failed"**
- ✅ Check MONGODB_URI is set in Render environment
- ✅ Verify MongoDB Atlas cluster is running
- ✅ Check IP whitelist in MongoDB Atlas (add 0.0.0.0/0)

**Error: "Build failed"**
- ✅ Check Root Directory is set to `server`
- ✅ Check Build Command is `npm install`
- ✅ Verify Start Command is `npm start`
- ✅ Check logs for specific error

**Error: "Port already in use"**
- ✅ Don't set PORT variable (leave empty)
- ✅ Render assigns port automatically

### Backend Deployed But Returns "Bad Gateway"

**Error: 502 Bad Gateway**
- ✅ Server not listening on 0.0.0.0 (check index.js line 352)
- ✅ MongoDB connection is failing (check logs)
- ✅ Wrong MONGODB_URI in environment
- ✅ Service restarting (check logs for errors)

**Solution**: Go to **Logs** tab and look for error messages

### Dashboard Won't Load

**Error: "Error connecting to server backend"**
- ✅ Check VITE_API_BASE_URL is set correctly
- ✅ Verify it matches your backend URL
- ✅ Open DevTools Console to see exact error
- ✅ Check Network tab - where is it trying to call?

**Error: "404 Not Found" in Network tab**
- ✅ VITE_API_BASE_URL might be missing trailing `/api`
- ✅ Should be: `https://sanction-backend.onrender.com`
- ✅ NOT: `https://sanction-backend.onrender.com/api`

### Dashboard Loads But Features Don't Work

**Symptoms: Member list empty, can't log infraction, etc.**
- ✅ Check backend is responding: `curl https://sanction-backend.onrender.com/api/state`
- ✅ Open DevTools Console → Network tab
- ✅ Try an action and look at the request/response
- ✅ Check backend logs for errors

---

## Monitoring Your Deployment

### Check Backend Status

1. Dashboard → sanction-backend → **Logs**
2. Look for: "Express Sanction Backend running"
3. Look for: "MongoDB Connected successfully"

### Check Dashboard Status

1. Dashboard → sanction-dashboard → **Logs**
2. Build should complete with no errors
3. Should show "Deployment successful"

### Monitor Resources

1. Go to each service → **Metrics**
2. Monitor CPU, memory, and API response times
3. Free tier has some limitations - watch for issues

---

## Redeployment

After making code changes:

```bash
git add -A
git commit -m "Your changes"
git push origin main
```

**Option 1: Automatic** (if configured)
- Render auto-deploys from main branch

**Option 2: Manual**
1. Go to Dashboard → Service
2. Click **Manual Deploy** → **Deploy latest commit**

---

## Production Checklist

- [ ] Backend deployed to Render
- [ ] Environment variables set in Render (MONGODB_URI, NODE_ENV)
- [ ] Backend logs show "MongoDB Connected successfully"
- [ ] Dashboard deployed to Render
- [ ] VITE_API_BASE_URL set to backend URL
- [ ] Dashboard loads without console errors
- [ ] API calls visible in Network tab
- [ ] Member data loads
- [ ] Can record infraction
- [ ] Can process payment
- [ ] Backend logs show successful API calls

---

## Performance Tips

1. **If dashboard is slow**:
   - Upgrade dashboard to Starter tier
   - Add caching headers

2. **If backend is slow**:
   - Check MongoDB Atlas for slow queries
   - Upgrade to Starter tier
   - Add database indexes

3. **If experiencing downtime**:
   - Free tier services spin down after 15 min inactivity
   - Upgrade to Starter for always-on
   - Add external monitoring (Uptime Robot)

---

## Cleanup

After confirming production is working:

1. **Delete old localhost references**:
   - Remove any hardcoded `localhost:3000` from code
   - Update documentation

2. **Secure credentials**:
   - Ensure `.env` is in `.gitignore`
   - Don't share Render URLs publicly if sensitive
   - Rotate MongoDB password (optional but recommended)

---

**🎉 Your application is now live!**

Frontend: `https://sanction-dashboard.onrender.com`
Backend: `https://sanction-backend.onrender.com`
Database: MongoDB Atlas cluster

---

## Need Help?

Check these files for detailed information:
- [CONFIGURATION_SUMMARY.md](./CONFIGURATION_SUMMARY.md)
- [MONGODB_ATLAS_SETUP.md](./MONGODB_ATLAS_SETUP.md)
- [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
