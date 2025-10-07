# 🚀 Railway Deployment Guide - PromptGrammerly

## 🎯 **Complete Deployment Checklist**

### **1. Railway Setup & Configuration**

#### **A. Create Railway Project**
1. **Go to**: [railway.app](https://railway.app)
2. **Login** with your GitHub account
3. **Create New Project** → "Deploy from GitHub repo"
4. **Select your repository**: `promptgrammerly` (or your repo name)
5. **Choose**: "Deploy from existing Dockerfile"

#### **B. Environment Variables Setup**
In Railway dashboard → Variables tab, add these:

```env
# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Application
APP_NAME=PromptGrammerly
APP_VERSION=2.0.4
HOST=0.0.0.0
PORT=8000
WORKERS=4

# AI Providers
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
TOGETHER_API_KEY=your_together_key

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key

# Razorpay LIVE Credentials
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_SECRET_KEY=your_live_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Rate Limiting
RATE_LIMIT_PER_MINUTE=120
RATE_LIMIT_PER_HOUR=2000

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60

# Health Check
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=10

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### **2. Domain Configuration**

#### **A. Custom Domain Setup**
1. **In Railway Dashboard** → Settings → Domains
2. **Add Custom Domain**: `promptgrammerly.com`
3. **Add Subdomain**: `api.promptgrammerly.com` (optional)
4. **Configure DNS** (Railway will provide instructions)

#### **B. SSL Certificate**
- Railway automatically provides SSL certificates
- Your domain will be: `https://promptgrammerly.com`

### **3. Razorpay Webhook Configuration**

#### **Update Webhook URL in Razorpay Dashboard:**
1. **Go to**: [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → Webhooks
2. **Update Webhook URL**: `https://promptgrammerly.com/api/v1/payment/webhook`
3. **Verify Events**:
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `order.paid`
4. **Test Webhook** using Razorpay's test feature

### **4. Chrome Extension Update**

#### **A. Update Extension Config**
✅ Already done - Extension now points to `https://promptgrammerly.com`

#### **B. Extension Deployment**
1. **Package extension** for Chrome Web Store
2. **Update manifest.json** if needed
3. **Test extension** with production API

### **5. Database & Backend Verification**

#### **A. Supabase Configuration**
- ✅ Database connection working
- ✅ User subscription system ready
- ✅ Payment upgrade flow configured

#### **B. API Endpoints Verification**
- ✅ `/api/v1/payment/create-order` - Working
- ✅ `/api/v1/payment/verify` - Working  
- ✅ `/api/v1/payment/webhook` - Working
- ✅ `/api/v1/payment/subscription-status/{email}` - Working
- ✅ `/api/v1/payment/checkout-page` - Working

### **6. Production Testing**

#### **A. Health Check**
```bash
curl https://promptgrammerly.com/api/v1/health
```

#### **B. Payment Flow Test**
1. **Create test order**: `POST /api/v1/payment/create-order`
2. **Test webhook**: Use Razorpay test webhook
3. **Verify subscription**: Check user upgrade

#### **C. Chrome Extension Test**
1. **Load extension** in Chrome
2. **Test payment flow** end-to-end
3. **Verify subscription** status updates

### **7. Monitoring & Logs**

#### **A. Railway Monitoring**
- **Logs**: Available in Railway dashboard
- **Metrics**: CPU, Memory, Network usage
- **Health checks**: Automatic monitoring

#### **B. Application Monitoring**
- **Payment logs**: Track successful/failed payments
- **User analytics**: Subscription conversions
- **Error tracking**: Failed requests and errors

### **8. Security Checklist**

#### **A. Production Security**
- ✅ HTTPS enabled (automatic with Railway)
- ✅ Environment variables secured
- ✅ API rate limiting active
- ✅ Webhook signature verification
- ✅ Payment signature verification

#### **B. Domain Security**
- ✅ SSL certificate (automatic)
- ✅ CORS configured for production
- ✅ Trusted hosts configured

## 🎯 **Deployment Commands**

### **Railway CLI (Optional)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

### **Manual Deployment**
1. **Push to GitHub** (if not already)
2. **Railway auto-deploys** from GitHub
3. **Monitor deployment** in Railway dashboard

## 🚨 **Critical Post-Deployment Steps**

### **1. Immediate Verification**
- [ ] **Health check**: `https://promptgrammerly.com/api/v1/health`
- [ ] **Payment test**: Create test order
- [ ] **Webhook test**: Verify webhook receives events
- [ ] **Extension test**: Load and test extension

### **2. Razorpay Dashboard Updates**
- [ ] **Update webhook URL** to production
- [ ] **Test webhook** with live events
- [ ] **Verify payment flow** end-to-end

### **3. Chrome Extension**
- [ ] **Update extension** with production URL
- [ ] **Test payment flow** in browser
- [ ] **Verify subscription** upgrades

## 🎉 **Success Metrics**

### **Payment System**
- ✅ Orders created successfully
- ✅ Payments processed
- ✅ Users upgraded to pro
- ✅ Webhooks working
- ✅ Subscription status updates

### **User Experience**
- ✅ Chrome extension loads
- ✅ Payment flow smooth
- ✅ Subscription upgrades automatic
- ✅ Error handling graceful

---

## 🚀 **Ready to Deploy!**

Your system is production-ready. Follow this guide step by step, and you'll have PromptGrammerly live on Railway with your custom domain!
