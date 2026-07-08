# Render Deployment Guide

## Overview
This application consists of:
1. **Backend**: Express.js server (Node.js)
2. **Frontend**: React dashboard (Vite)
3. **Database**: MongoDB

## Prerequisites
- Render account: https://render.com
- MongoDB Atlas account: https://www.mongodb.com/cloud/atlas
- GitHub repository with your code pushed

## Step 1: Set Up MongoDB Atlas

1. Create a MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user with authentication enabled
3. Whitelist your Render IP (or use 0.0.0.0 for simplicity during setup)
4. Get your connection string in the format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/sanction_payment?retryWrites=true&w=majority
   ```

## Step 2: Deploy Backend on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `sanction-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free (or Starter for better performance)

5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas connection string from Step 1
   - `PORT`: Leave empty (Render sets this automatically)

6. Click "Create Web Service" and wait for deployment

## Step 3: Deploy Frontend on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure the site:
   - **Name**: `sanction-dashboard`
   - **Root Directory**: `dashboard`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

5. Add Environment Variables:
   - `VITE_API_BASE_URL`: The URL of your backend service (e.g., `https://sanction-backend.onrender.com`)

6. Click "Create Static Site" and wait for deployment

## Step 4: Verify Deployment

1. Navigate to your frontend URL (e.g., https://sanction-dashboard.onrender.com)
2. Check that the dashboard loads
3. Try creating a member or logging an infraction to verify backend connectivity
4. Check Render logs if there are issues:
   - Backend: Dashboard → Web Service → Logs
   - Frontend: Dashboard → Static Site → Logs

## Troubleshooting

### "Bad Gateway" Error
- **Cause**: Backend not listening on correct interface or port
- **Solution**: Ensure backend listens on `0.0.0.0` (fixed in index.js)
- **Check**: Verify `MONGODB_URI` is correct and database is accessible

### Frontend can't reach backend
- **Cause**: `VITE_API_BASE_URL` not set or incorrect
- **Solution**: Set `VITE_API_BASE_URL` to your backend service URL
- **Check**: Open browser DevTools → Network tab and verify API requests go to correct URL

### MongoDB connection failed
- **Cause**: Wrong connection string, IP not whitelisted, or invalid credentials
- **Solution**: 
  - Double-check connection string format
  - Add 0.0.0.0 to IP whitelist in MongoDB Atlas
  - Verify username and password (special characters must be URL-encoded)

### Frontend shows "Error connecting to server"
- **Check**:
  1. Is backend service running? (Check Render logs)
  2. Is `VITE_API_BASE_URL` set correctly?
  3. Are CORS policies configured correctly in backend?
  4. Is MongoDB connection working? (Check backend logs)

## Manual Deployment Commands (Alternative)

If you prefer to deploy manually instead of using Render's dashboard:

```bash
# Build frontend
cd dashboard
npm install
npm run build

# This creates a dist/ folder ready for static hosting
```

Then update the Render Static Site's publish directory to `dashboard/dist`

## Environment Variables Summary

### Backend (.env in server/)
```
PORT=3000  # Render will override this
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sanction_payment?retryWrites=true&w=majority
```

### Frontend (.env in dashboard/)
```
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```

## Important Notes

1. **Render Free Tier**: Services spin down after 15 minutes of inactivity. Use a Starter plan for persistent availability.
2. **MongoDB Atlas**: Free tier has limitations. Monitor your usage.
3. **CORS**: Backend allows all origins with `cors()`. Consider restricting in production.
4. **Data Persistence**: Data is stored in MongoDB Atlas. Local data.json is only used for seeding.

## Re-deployment

To re-deploy after code changes:
1. Push code to GitHub
2. Render automatically redeploys (if connected)
3. Or manually redeploy from Render dashboard:
   - Dashboard → Service → Manual Deploy → Deploy latest commit
