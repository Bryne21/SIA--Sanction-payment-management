# ✅ MongoDB Atlas Configuration - Complete

## Your Setup Summary

✅ **MongoDB Connection**: MongoDB Atlas (Admin-SchoolOrg database)
✅ **Backend Port**: 3000 (Render will auto-assign)
✅ **Server Binding**: 0.0.0.0 (listens on all interfaces)
✅ **Environment Variables**: Properly configured with dotenv

---

## Files Updated

### 1. `server/.env` 
- **Status**: ✅ Updated
- **Contains**: MongoDB Atlas connection string with credentials
- **Note**: Keep this file secure (don't commit to GitHub)

### 2. `server/index.js`
- **Status**: ✅ Already Configured  
- **Key Features**:
  ```javascript
  require('dotenv').config();  // Loads .env variables
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanction_payment';
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', ...)  // Listens on all interfaces
  ```

---

## Ready to Deploy on Render

### Step 1: Push to GitHub
```bash
git add server/.env server/index.js server/.env.example
git commit -m "Configure MongoDB Atlas connection"
git push origin main
```

### Step 2: Create Render Web Service
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure as follows:

| Setting | Value |
|---------|-------|
| **Name** | sanction-backend |
| **Runtime** | Node |
| **Root Directory** | server |
| **Build Command** | npm install |
| **Start Command** | npm start |
| **Instance Type** | Free (or Starter for production) |

### Step 3: Add Environment Variables in Render
1. After creating the service, go to **Settings** → **Environment**
2. Add these variables:

| Key | Value |
|-----|-------|
| `PORT` | (Leave empty - Render sets automatically) |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://ned:jp@cluster0.kdgy8kh.mongodb.net/Admin-SchoolOrg?retryWrites=true&w=majority&appName=Cluster0` |

3. Click **Save Changes**

### Step 4: Deploy
1. Click **Manual Deploy** → **Deploy latest commit**
2. Wait for deployment to complete
3. Check logs to verify:

**Expected log output:**
```
MongoDB Connected successfully to: mongodb+srv://ned:jp@cluster0.kdgy8kh.mongodb.net/Admin-SchoolOrg?retryWrites=true&w=majority&appName=Cluster0
Express Sanction Backend running on port 10000
```

### Step 5: Get Your Backend URL
After successful deployment, Render will show your service URL like:
```
https://sanction-backend.onrender.com
```
Save this for your dashboard deployment.

---

## Verification Checklist

Before deployment, verify your backend locally:

```bash
cd server
npm install
npm start
```

You should see:
```
✅ MongoDB Connected successfully to: mongodb+srv://ned:jp@...
✅ Express Sanction Backend running on port 3000
```

### Testing the Connection

In another terminal:
```bash
curl http://localhost:3000/api/state
```

You should get a JSON response with members, ledger, and rules data.

---

## ⚠️ Important Security Notes

1. **Never commit `.env` to GitHub** - Add to `.gitignore`:
   ```
   server/.env
   dashboard/.env
   ```

2. **Render Environment Variables** - Always set sensitive data in Render dashboard, not in code

3. **MongoDB Connection String** - Your password is in the URL. In production:
   - Use strong passwords (30+ characters)
   - Consider IP whitelisting in MongoDB Atlas
   - Rotate credentials regularly

---

## Troubleshooting

### "MongoDB connection failed"
- **Cause**: MONGODB_URI environment variable not set in Render
- **Solution**: Go to Render dashboard → Settings → Environment → Add MONGODB_URI

### "Port already in use"
- **Cause**: Another process using port 3000 locally
- **Solution**: 
  ```bash
  lsof -i :3000  # Find process
  kill -9 <PID>  # Kill process
  ```

### "Cannot connect to MongoDB"
- **Cause**: MongoDB Atlas IP whitelist issue
- **Solution**: In MongoDB Atlas:
  1. Go to Network Access → IP Whitelist
  2. Add 0.0.0.0/0 (temporary for testing)
  3. Or add Render's IP range

### Logs show timeout
- **Cause**: Render is starting but not responding
- **Solution**: 
  1. Check MONGODB_URI is correct
  2. Check MongoDB Atlas cluster is running
  3. Try restarting the service

---

## Next Steps

1. ✅ **Backend**: Deploy to Render (follow Step 1-5 above)
2. 📱 **Dashboard**: Deploy to Render (update VITE_API_BASE_URL to your backend URL)
3. 🧪 **Test**: Verify full integration works end-to-end

Your backend is ready to go! 🚀
