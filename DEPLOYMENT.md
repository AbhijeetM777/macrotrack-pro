# MacroTrack Pro - Deployment Guide

This app is a **static Progressive Web App (PWA)** that can be deployed to any static hosting platform.

## Quick Start (Recommended)

### **Option 1: Vercel (Easiest)**

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Deploy via CLI**:
   ```bash
   vercel
   ```
   Follow the prompts. It will auto-detect the project as a static site.

3. **Or Deploy via GitHub**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repo: `AbhijeetM777/macrotrack-pro`
   - Vercel will auto-detect settings from `vercel.json`
   - Click "Deploy"
   - Your site will be live at `macrotrack-pro.vercel.app`

### **Option 2: Netlify (Also Easy)**

1. **Deploy via Web**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select GitHub repo: `AbhijeetM777/macrotrack-pro`
   - Netlify will auto-detect settings from `netlify.toml`
   - Click "Deploy site"

2. **Or Deploy via CLI**:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

### **Option 3: GitHub Pages (Free)**

1. Go to repo Settings → Pages
2. Select "Deploy from a branch"
3. Choose `master` branch, root folder
4. Save — site will be live at `abhijeetm777.github.io/macrotrack-pro`

---

## Automated Deployments

### **GitHub Actions (CI/CD)**

This repo includes `.github/workflows/validate-and-deploy.yml` which:
- ✅ Validates code quality on every push
- ✅ Checks for hardcoded secrets
- ✅ Verifies video tags have proper attributes
- ✅ Auto-deploys to Vercel on `master` push
- 🔍 Runs Lighthouse audits on PRs

**To enable automatic deployments to Vercel:**

1. Get your Vercel tokens:
   - Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Create a new token, copy it

2. Add GitHub Secrets:
   - Go to GitHub repo Settings → Secrets and variables → Actions
   - Add these secrets:
     - `VERCEL_TOKEN` = your Vercel token
     - `VERCEL_ORG_ID` = your Vercel org ID (from account settings)
     - `VERCEL_PROJECT_ID` = project ID (shown in `vercel.json`)
     - `VERCEL_SCOPE` = your username/org slug

3. Push to master — it will auto-deploy!

---

## Deployment Checklist

Before deploying, verify:

- ✅ No hardcoded API keys or secrets
- ✅ All videos have `preload="metadata"`
- ✅ `manifest.json` is present
- ✅ Service Worker (`sw.js`) is up to date
- ✅ Dark/light mode works
- ✅ Responsive design tested on mobile
- ✅ localStorage works in private browsing
- ✅ Video quality selector works

---

## Performance Optimization

### Cache Strategy

Videos are cached with:
```
Cache-Control: public, max-age=3600, s-maxage=86400
```
- Browser cache: 1 hour
- CDN cache: 24 hours

To invalidate cache on updates, update `vercel.json` or rebuild.

### Video Quality

Users can choose quality in Profile → Video Quality:
- **360p (SD)**: ~50MB/hour
- **720p (HD)**: ~150MB/hour (default)
- **1080p (Full HD)**: ~300MB/hour

---

## Monitoring

### Vercel Dashboard
- Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- Monitor build logs, deployments, and analytics
- Set up alerts for failed deployments

### Netlify Dashboard
- Go to [app.netlify.com](https://app.netlify.com)
- View analytics, build logs, and status
- Configure deploys and redirects

---

## Troubleshooting

### Videos not playing on mobile?
- Check Video Quality setting (try lower quality)
- Clear browser cache (Settings → Clear Data)
- Test in Safari, Chrome, Firefox

### Build fails on Vercel/Netlify?
- Check if `index.html` exists in root
- Verify no Node.js dependencies needed (static site)
- Check GitHub Actions logs for details

### Service Worker cached old version?
- Increment `CACHE_NAME` in `sw.js`
- Force hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

## Custom Domain

### On Vercel
1. Go to Project Settings → Domains
2. Enter your domain (e.g., `nutrition.app`)
3. Add DNS records as shown
4. Wait for SSL certificate (takes ~10 min)

### On Netlify
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Configure DNS or use Netlify's name servers

---

## Environment Variables

This static app doesn't use environment variables, but if you add backend APIs in future:

**Vercel**: Settings → Environment Variables
**Netlify**: Site Settings → Build & Deploy → Environment

---

## Rollback (If needed)

### Vercel
1. Go to Deployments tab
2. Click on previous deployment
3. Click "Promote to Production"

### Netlify
1. Go to Deploys tab
2. Click on previous deploy
3. Click "Publish Deploy"

---

## Questions?

Check GitHub Issues: https://github.com/AbhijeetM777/macrotrack-pro/issues

---

**Last Updated**: March 31, 2026
**Deployment System**: Vercel + GitHub Actions
