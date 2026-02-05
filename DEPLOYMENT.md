# 🚀 Deploying Vyonix Studio to Google Cloud Run

To participate in the **Gemini API Developer Competition** (Hackathon) or deploy Vyonix AI Data Factory for demo purposes, follow this guide.

## 🔑 The "API Key" Question
**"Will this take my API Key?"**
*   **Yes**, if you deploy using your own API Key in the environment variables, the hosted application will consume **your** specific quota/billing.
*   **Is it Safe?**: **Yes**. The key is stored securely on the Google Cloud server. Users visiting your website *cannot* see or steal your key.
*   **Hackathon Strategy**: 
    1.  Go to [Google AI Studio](https://aistudio.google.com/).
    2.  Create a **New API Key** specifically for this "Vyonix Demo".
    3.  Set up billing budgets in Google Cloud Console to prevent overage.
    4.  Deploy using this specific key. If quota runs out, simply rotate the key or restrict the service.

---

## ☁️ Deployment Steps (Cloud Run)

### Prerequisites
1.  **Google Cloud SDK** installed and authenticated (`gcloud auth login`).
2.  **Docker** installed (optional, but recommended for local testing).

### Step 1: Configure Project
Ensure you are in the `apps/web` directory (where the `Dockerfile` is).
```bash
# Set your Google Cloud Project ID
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Build & Deploy
Run this single command to build the container and deploy it to Cloud Run. Replace `YOUR_API_KEY` with your actual Gemini API Key.

```bash
gcloud run deploy vyonix-studio \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
```

### Step 3: Verification
Once the command finishes, it will print a **Service URL** (e.g., `https://vyonix-studio-xyz-uc.a.run.app`).
*   **Visit this URL**.
*   The application is now live and public!
*   Any user interacting with the Audio, Vision, or NLP studios will generate requests using the API Key you provided in Step 2.

---

## 🛡️ Hackathon "Best Practices"
*   **Demo Mode**: For judges, "Zero Friction" is key. Do **not** ask them to input their own key. Use your own key to ensure the "Wow" factor works instantly.
*   **Rate Limits**: Cloud Run scales automatically. If you are worried about costs, you can limit the maximum number of instances:
    ```bash
    gcloud run services update vyonix-studio --max-instances 5
    ```

---
**Good luck with the Hackathon! 🚀**
