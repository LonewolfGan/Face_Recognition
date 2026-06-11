# Vercel Deployment Fix Guide

## 🚨 Issue: Blank Page on Vercel

The blank page is caused by the application failing to start due to missing required environment variables in production mode.

## 🔧 Root Cause

Our security fixes now require these environment variables in production:
- `SECRET_KEY` - Flask session secret
- `JWT_SECRET_KEY` - JWT token signing key  
- `CORS_ORIGINS` - Allowed frontend origins

## ✅ Solution: Configure Vercel Environment Variables

### Step 1: Go to your Vercel project settings
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Face Recognition project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Required Environment Variables

Add these variables to your Vercel project:

| Name | Value | Required |
|------|-------|----------|
| `FLASK_ENV` | `production` | ✅ Yes |
| `SECRET_KEY` | Generate a strong 32+ character key | ✅ Yes |
| `JWT_SECRET_KEY` | Generate a strong 32+ character key | ✅ Yes |
| `CORS_ORIGINS` | `https://your-app-name.vercel.app` | ✅ Yes |
| `DATABASE_URL` | Your PostgreSQL connection URL | ⚠️ Recommended |

### Step 3: Generate Strong Secret Keys

Run these commands to generate secure keys:

```bash
# Generate SECRET_KEY (32+ characters)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY (32+ characters)  
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Example values:
```
SECRET_KEY=abc123-def456-ghi789-jkl012-mno345-pqr678
JWT_SECRET_KEY=xyz987-uvw654-rst321-opq098-lmn765-kji432
```

### Step 4: Set CORS Origins

For `CORS_ORIGINS`, use your Vercel app URL:
```
CORS_ORIGINS=https://your-username-face-recognition.vercel.app
```

If you have multiple domains, separate with commas:
```
CORS_ORIGINS=https://your-app.vercel.app,https://www.your-app.com
```

### Step 5: Redeploy

After adding the environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for the build to complete

## 🔍 Troubleshooting

### Check Deployment Logs
1. Go to the failed deployment
2. Click on **Logs** tab
3. Look for errors like:
   - `SECRET_KEY must be set to a strong, unique value in production`
   - `JWT_SECRET_KEY must be set to a strong, unique value in production`
   - `CORS_ORIGINS must be explicitly configured in production`

### Common Issues

**Issue: "Module not found" errors**
- Make sure you've installed the new dependencies: `pip install flask-wtf flask-talisman`
- Update your `requirements.txt` on Vercel

**Issue: CSRF token errors**
- The frontend may need to include CSRF tokens in requests
- Add this to your frontend API calls:
```javascript
// Include CSRF token in headers
const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
headers: {
  'Content-Type': 'application/json',
  'X-CSRFToken': csrfToken
}
```

**Issue: CORS errors**
- Make sure `CORS_ORIGINS` exactly matches your frontend URL
- Include the protocol (`https://`) and no trailing slash
- For local development, use: `http://localhost:5173`

## 📋 Vercel Configuration Checklist

- [ ] Added `FLASK_ENV=production`
- [ ] Added `SECRET_KEY` (32+ characters)
- [ ] Added `JWT_SECRET_KEY` (32+ characters)  
- [ ] Added `CORS_ORIGINS` (your Vercel app URL)
- [ ] Added `DATABASE_URL` (if using PostgreSQL)
- [ ] Installed new dependencies (`flask-wtf`, `flask-talisman`)
- [ ] Updated `requirements.txt` on Vercel
- [ ] Redeployed the application

## 🎯 Quick Fix: Temporary Development Mode (Not Recommended)

If you need to test quickly, you can set `FLASK_ENV=development` in Vercel:

1. Add environment variable: `FLASK_ENV=development`
2. Remove other required variables
3. Redeploy

⚠️ **Warning**: This is insecure for production! Only use for temporary testing.

## 🔒 Production Security Checklist

For a secure production deployment:

1. **Use strong secret keys** (32+ random characters)
2. **Set proper CORS origins** (exact domain matches)
3. **Use HTTPS** (Vercel provides this automatically)
4. **Use PostgreSQL** (not SQLite) for production database
5. **Enable rate limiting** (already configured)
6. **Monitor logs** for security issues

## 📚 Additional Resources

- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [Flask Production Deployment](https://flask.palletsprojects.com/en/2.3.x/deploying/)
- [Generating Secure Secret Keys](https://flask.palletsprojects.com/en/2.3.x/quickstart/#sessions)

## ✅ Next Steps

1. **Add environment variables** to Vercel as shown above
2. **Redeploy** your application
3. **Test thoroughly** - check authentication, API endpoints, and frontend functionality
4. **Monitor logs** for any errors
5. **Set up monitoring** for production issues

The blank page should be resolved once the required environment variables are properly configured in your Vercel project settings.