# 🚀 Railway Deployment Guide

## 🚨 CRITICAL: Update Railway URL Before Deploying

### Step 1: Get Your Railway URL
1. Go to your Railway dashboard
2. Find your deployed app
3. Copy the production URL (e.g., `https://your-app-name.railway.app`)

### Step 2: Update Configuration
Edit `chrome-extension/config.js` and replace:
```javascript
API_BASE_URL: 'https://your-railway-app-name.railway.app',
```
with your actual Railway URL (including the correct port):
```javascript
API_BASE_URL: 'https://your-actual-app-name.railway.app:8000',
```

**Important**: Make sure to include the correct port number (usually 8000 for Railway apps).

### Step 3: Test Configuration
1. Open Chrome DevTools
2. Go to the extension popup
3. Check console for:
```
🌐 Configuration loaded: {
  isProduction: true,
  apiUrl: "https://your-actual-app-name.railway.app",
  productionUrl: "https://your-actual-app-name.railway.app"
}
```

### Step 4: Deploy
1. Update the Railway URL in `config.js`
2. Test locally first
3. Deploy to Chrome Web Store

## 🔧 Configuration Details

### Environment Detection
- **Development**: Uses `http://localhost:8004`
- **Production**: Uses your Railway URL
- **Auto-detection**: Based on protocol and hostname

### API Endpoints
- `/api/v1/enhance` - Main enhancement endpoint
- `/api/v1/quick-test` - Fallback endpoint
- `/api/v1/health` - Health check
- `/api/v1/user/stats` - User statistics
- `/api/v1/user/count/{email}` - User count

### Permissions
The extension now has permission to connect to:
- `https://*.railway.app/*` - Railway apps
- `http://localhost:8004/*` - Local development

## 🚨 Common Issues

### Issue: "Failed to fetch" errors
**Solution**: Check that your Railway URL is correct and the app is running

### Issue: CORS errors
**Solution**: Ensure Railway app has proper CORS headers

### Issue: Extension not working in production
**Solution**: Verify the Railway URL in `config.js` matches your deployed app

## ✅ Verification Checklist

- [ ] Railway URL updated in `config.js`
- [ ] Railway app is deployed and running
- [ ] Extension loads without errors
- [ ] API calls work in production
- [ ] User authentication works
- [ ] Prompt enhancement works
- [ ] User stats are tracked

## 🎯 Ready for 10K Users!

Once configured, your extension will:
- ✅ Work in production with Railway
- ✅ Auto-detect environment
- ✅ Handle API failures gracefully
- ✅ Scale with your Railway app 