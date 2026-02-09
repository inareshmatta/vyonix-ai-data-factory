# ☁️ The "Cloud Shell" Method (No GitHub Link, No Local Setup)

If you don't want to link your GitHub account and your local `gcloud` isn't working, the best solution is to use **Google Cloud Shell**. It has all the tools pre-installed in your browser.

### 🚀 Step 1: Open Cloud Shell
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click the **"Activate Cloud Shell"** icon in the top-right toolbar (it looks like a terminal prompt `>_`).
3.  A terminal window will open at the bottom of your browser.

### 🚀 Step 2: Get Your Code
Type into the Cloud Shell terminal:
```bash
# Clone your repository (this works without linking accounts)
git clone https://github.com/inareshmatta/vyonix-studio.git

# Enter the project directory
cd vyonix-studio/apps/web
```

### 🚀 Step 3: Deploy
Copy and paste this command into the Cloud Shell. **Replace the API Key** with your real one before looking away!

```bash
gcloud run deploy vyonix-studio \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
```

### 🚀 Step 4: Confirm
1.  It will ask to authorize Cloud Shell -> Click **Authorize**.
2.  Ideally, within 2-3 minutes, it will give you the **Service URL**.

---
**Why this works**: Cloud Shell is a temporary virtual machine provided by Google. It authenticates as *you* automatically, so you don't need to install anything locally or link third-party apps.
