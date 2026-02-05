# ☁️ No-Code Deployment Guide: Google Cloud Run

Since the command line tools (`gcloud`) are not working for you, you can deploy **Vyonix AI Data Factory** directly from your web browser using the Google Cloud Console.

### ✅ Prerequisites
1.  Your code is already pushed to GitHub (`inareshmatta/vyonix-studio`).
2.  You have your **Google AI Studio Key**.

---

### 🚀 Step 1: Open Google Cloud Run
1.  Go to the **[Google Cloud Run Console](https://console.cloud.google.com/run)**.
2.  Click the blue **"CREATE SERVICE"** button at the top.

### 🚀 Step 2: Connect Your GitHub
1.  Select **"Continuously deploy new revisions from a source repository"**.
2.  Click **"SET UP WITH CLOUD BUILD"**.
3.  **Repository Provider**: Select **GitHub**.
4.  **Repository**: Select `inareshmatta/vyonix-studio`.
5.  **Branch**: Select `^main`.
6.  **Build Configuration**:
    *   Select **"Dockerfile"**.
    *   **Source location**: Enter `/apps/web/Dockerfile` (or just browse to select the Dockerfile inside `apps/web`).
    *   Click **SAVE**.

### 🚀 Step 3: Configure Service
1.  **Service Name**: `vyonix-studio` (or whatever you prefer).
2.  **Region**: `us-central1` (recommended).
3.  **Authentication**: Select **"Allow unauthenticated invocations"** (This makes your website public for the Hackathon).

### 🚀 Step 4: Add Your API Key (Critical!)
1.  Expand the **"Container, Networking, Security"** arrow at the bottom.
2.  Click on the **"VARIABLES & SECRETS"** tab.
3.  Click **"ADD VARIABLE"**.
4.  **Name**: `GOOGLE_GENERATIVE_AI_API_KEY`
5.  **Value**: *[Paste your AI Studio Key here]*

### 🚀 Step 5: Create & Deploy
1.  Click the blue **"CREATE"** button at the bottom.
2.  Google Cloud will now pull your code from GitHub, build the Docker container, and deploy it.
3.  Wait 2-3 minutes. You will see a green checkmark and a **URL** at the top (e.g., `https://vyonix-studio-xyz.a.run.app`).

**🎉 Success! Your Vyonix AI Data Factory is now live.**
