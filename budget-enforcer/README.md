# Budget Enforcer Setup Instructions

## What This Does
This Cloud Function **automatically stops your Cloud Run service** when your billing hits $10 to prevent any overage charges.

---

## 📋 Deployment Steps

### 1. Deploy the Cloud Function

```bash
# Navigate to the budget-enforcer directory
cd d:\Anodatasense\budget-enforcer

# Deploy the function
gcloud functions deploy budget-enforcer \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=enforceBudget \
  --trigger-topic=budget-notifications \
  --project=alert-nimbus-482707-p6
```

### 2. Create Budget with Pub/Sub Notifications

1. Go to [Google Cloud Console - Budgets](https://console.cloud.google.com/billing/budgets)
2. Click **CREATE BUDGET**
3. Configure:
   - **Project**: `alert-nimbus-482707-p6`
   - **Budget amount**: $10
   - **Alert threshold**: 100%
4. Under **Manage notifications**:
   - Select **Connect a Pub/Sub topic to this budget**
   - Choose **"Create a topic"**
   - Name it: `budget-notifications`
   - Click **CREATE**
5. Save the budget

### 3. Grant Permissions

```bash
# Get the Cloud Function service account
SERVICE_ACCOUNT=$(gcloud functions describe budget-enforcer \
  --region=us-central1 \
  --gen2 \
  --project=alert-nimbus-482707-p6 \
  --format="value(serviceConfig.serviceAccountEmail)")

# Grant permission to delete Cloud Run services
gcloud projects add-iam-policy-binding alert-nimbus-482707-p6 \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/run.admin"
```

---

## ✅ How It Works

1. **Budget reaches $10** → Pub/Sub message is sent to `budget-notifications` topic
2. **Cloud Function triggers** → Receives the notification
3. **Service is PAUSED** → Scaled to 0 instances (no traffic, no charges)
4. **No more charges** → Service stays deployed but offline

---

## 🔄 Restarting After Pause

If your service gets paused and you want to resume:

```bash
# Option 1: Via gcloud (scale back to 1-100 instances)
gcloud run services update vyonix-studio \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=100 \
  --project=alert-nimbus-482707-p6

# Option 2: Via Cloud Console
# Go to: https://console.cloud.google.com/run/detail/us-central1/vyonix-studio
# Click "EDIT & DEPLOY NEW REVISION"
# Under "Autoscaling" → Set "Maximum number of instances" to 100
# Click "DEPLOY"
```

---

## ⚠️ Important Notes

- **Service is PAUSED, not deleted** - All configuration is preserved
- **0 instances = 0 charges** - No traffic can reach the service
- **Instant restart** - Just update the scaling settings to resume
- **Check your current spend** before deploying: [Billing Dashboard](https://console.cloud.google.com/billing)
- **Test the function** by viewing logs: [Cloud Functions Logs](https://console.cloud.google.com/functions/details/us-central1/budget-enforcer)

---

## Alternative: Delete Instead of Pause

If you want to **completely delete** the service instead of pausing, change line 38-50 in `index.js` to:
```javascript
await client.deleteService({
  name: servicePath,
});
```

This removes the service entirely (you'd need to redeploy from scratch to restart).
