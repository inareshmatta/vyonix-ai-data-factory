@echo off
echo ========================================
echo   Budget Enforcer Setup
echo   Automatically pauses service at $10
echo ========================================
echo.

cd /d "d:\Anodatasense\budget-enforcer"

echo [Step 1/3] Deploying Cloud Function...
echo.
gcloud functions deploy budget-enforcer --gen2 --runtime=nodejs20 --region=us-central1 --source=. --entry-point=enforceBudget --trigger-topic=budget-notifications --project=alert-nimbus-482707-p6

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Function deployment failed!
    echo Make sure gcloud is installed and you're logged in.
    echo Run: gcloud auth login
    pause
    exit /b 1
)

echo.
echo SUCCESS! Function deployed.
echo.
echo [Step 2/3] Granting permissions...
echo.

REM Get the service account from the deployed function
for /f "delims=" %%i in ('gcloud functions describe budget-enforcer --region=us-central1 --gen2 --project=alert-nimbus-482707-p6 --format="value(serviceConfig.serviceAccountEmail)"') do set SERVICE_ACCOUNT=%%i

echo Service Account: %SERVICE_ACCOUNT%
echo.

gcloud projects add-iam-policy-binding alert-nimbus-482707-p6 --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/run.admin"

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Permission grant may have failed
    echo Try running this manually:
    echo gcloud projects add-iam-policy-binding alert-nimbus-482707-p6 --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/run.admin"
)

echo.
echo SUCCESS! Permissions granted.
echo.
echo ========================================
echo   ALMOST DONE!
echo ========================================
echo.
echo [Step 3/3] Create Budget (Manual Step)
echo.
echo The browser will open in 5 seconds...
echo You need to:
echo   1. Click "CREATE BUDGET"
echo   2. Set Project: alert-nimbus-482707-p6
echo   3. Set Amount: $10
echo   4. Set Alert: 100%%
echo   5. Under "Manage notifications":
echo      - Enable "Pub/Sub topic"
echo      - Click "CREATE A TOPIC"
echo      - Name: budget-notifications
echo      - Click CREATE
echo   6. Click FINISH
echo.
timeout /t 5 /nobreak >nul

start https://console.cloud.google.com/billing/budgets?project=alert-nimbus-482707-p6

echo.
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo Your Cloud Run service will automatically
echo PAUSE when billing reaches $10.
echo.
echo To restart after pause:
echo   gcloud run services update vyonix-studio --region=us-central1 --max-instances=100 --project=alert-nimbus-482707-p6
echo.
pause
