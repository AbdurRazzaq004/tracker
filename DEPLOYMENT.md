# WealthTracker Deployment Guide

## 🚀 Deploy to Render (Recommended - FREE)

### Step 1: Prepare Your Code
1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/WealthTracker.git
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` file
5. Click "Apply" - Render will automatically:
   - Install dependencies
   - Build your app
   - Start the server

### Step 3: Environment Variables (Important!)
The `render.yaml` file includes most variables, but you should:
1. Go to your service dashboard on Render
2. Navigate to "Environment" tab
3. Verify these variables are set:
   - `MONGODB_URI` - Your MongoDB connection string (already set)
   - `SESSION_SECRET` - Auto-generated secure secret
   - `NODE_ENV` - Set to `production`
   - `PORT` - Set to `5000`

### Step 4: Access Your App
- Your app will be live at: `https://wealthtracker-XXXX.onrender.com`
- First load might take 1-2 minutes (free tier cold starts)

---

## 🔄 Alternative: Deploy to Railway

### Step 1: Deploy
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js

### Step 2: Configure
1. Add environment variables in Railway dashboard:
   ```
   MONGODB_URI=your-mongodb-connection-string-here
   SESSION_SECRET=your-secret-key-here
   NODE_ENV=production
   ```
2. Set build command: `npm run build`
3. Set start command: `npm start`

---

## 🌐 Alternative: Deploy to Fly.io

### Step 1: Install Fly CLI
```bash
brew install flyctl
# or
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login and Launch
```bash
fly auth login
fly launch
```

### Step 3: Set Environment Variables
```bash
fly secrets set MONGODB_URI="mongodb+srv://growmoree001_db_user:growmoree001@moneymanagement.emnpjop.mongodb.net/moneymanagement"
fly secrets set SESSION_SECRET="your-secret-key"
fly secrets set NODE_ENV="production"
```

### Step 4: Deploy
```bash
fly deploy
```

---

## 📝 Important Notes

### Super Admin Access
- Email: `abdurrazzaq00000@gmail.com`
- Password: `razzaq@143@@`
- The super admin is auto-created on first deployment

### MongoDB Atlas Setup
Your MongoDB is already configured at:
- Host: `moneymanagement.emnpjop.mongodb.net`
- Make sure to whitelist Render's IP (or use 0.0.0.0/0 for all IPs)

To whitelist IPs in MongoDB Atlas:
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Navigate to "Network Access"
3. Click "Add IP Address"
4. Choose "Allow Access from Anywhere" (0.0.0.0/0)
5. Confirm

### Session Storage
Currently using in-memory session storage (fine for single instance).
For production at scale, consider:
- Redis-backed sessions
- MongoDB session store

---

## 🐛 Troubleshooting

### Build Fails
- Check Node version (should be 20+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### Can't Connect to Database
- Verify MongoDB Atlas IP whitelist
- Check MONGODB_URI is correct
- Ensure MongoDB user has correct permissions

### App Crashes on Start
- Check environment variables are set
- Review server logs in hosting platform
- Verify PORT is set to 5000

---

## 🔐 Security Recommendations

Before going to production:
1. **Change SESSION_SECRET** to a strong random string
2. **Update MongoDB credentials** (current ones are exposed in code)
3. **Set up proper MongoDB user** with limited permissions
4. **Enable HTTPS** (Render does this automatically)
5. **Set secure cookie options** for production

---

## 📊 Monitoring

### Render Dashboard
- View logs, metrics, and health checks
- Set up custom domain
- Enable auto-deploy on git push

### Free Tier Limitations (Render)
- App sleeps after 15 mins of inactivity
- 750 hours/month free
- First request after sleep takes ~30 seconds

---

## ✅ Post-Deployment Checklist

- [ ] App is accessible via URL
- [ ] Super admin can login
- [ ] New users can register
- [ ] Admin can approve users
- [ ] Users can add/delete expenses
- [ ] Dashboard shows correct data
- [ ] All pages load correctly
- [ ] Mobile view works properly

---

**Need Help?** Check hosting platform documentation:
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Fly.io Docs](https://fly.io/docs)
