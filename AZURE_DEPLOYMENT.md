# Azure Deployment Guide (Simplified)

This guide uses **Azure App Service** with GitHub integration for simple, automated deployment. No Terraform or complex DevOps needed.

## Prerequisites

- Azure account with active subscription (free tier won't work for app service due to resource requirements)
- GitHub repository set up
- Basic knowledge of Azure portal or Azure CLI

## Quick Start (5 steps)

### Step 1: Create Azure Resources

Using Azure CLI (easiest):

```bash
# Login to Azure
az login

# Create resource group
az group create --name asha-rg --location eastus

# Create PostgreSQL database
az postgres server create \
  --resource-group asha-rg \
  --name asha-db-server \
  --location eastus \
  --admin-user ashaadmin \
  --admin-password "YourStrongPassword123!" \
  --sku-name B_Gen5_1

# Create database
az postgres db create \
  --resource-group asha-rg \
  --server-name asha-db-server \
  --name asha_db

# Create container registry
az acr create \
  --resource-group asha-rg \
  --name asharegistry \
  --sku Basic

# Create App Service Plan (Linux)
az appservice plan create \
  --name asha-plan \
  --resource-group asha-rg \
  --sku S1 \
  --is-linux

# Get ACR credentials
az acr credential show --name asharegistry --resource-group asha-rg
```

### Step 2: Set GitHub Secrets

In your GitHub repo, go to **Settings → Secrets and variables → Actions**. Add:

```
AZURE_REGISTRY_URL=asharegistry.azurecr.io
AZURE_REGISTRY_USERNAME=<from last command output>
AZURE_REGISTRY_PASSWORD=<from last command output>
```

### Step 3: Create Backend App Service

```bash
# Create App Service for backend
az webapp create \
  --resource-group asha-rg \
  --plan asha-plan \
  --name asha-api \
  --deployment-container-image-name asharegistry.azurecr.io/asha-backend:latest

# Configure container registry
az webapp config container set \
  --name asha-api \
  --resource-group asha-rg \
  --docker-custom-image-name asharegistry.azurecr.io/asha-backend:latest \
  --docker-registry-server-url https://asharegistry.azurecr.io \
  --docker-registry-server-user <AZURE_REGISTRY_USERNAME> \
  --docker-registry-server-password <AZURE_REGISTRY_PASSWORD>

# Configure environment variables
az webapp config appsettings set \
  --resource-group asha-rg \
  --name asha-api \
  --settings \
    DEBUG=False \
    SECRET_KEY="your-django-secret-key-here" \
    DB_ENGINE=django.db.backends.postgresql \
    DB_NAME=asha_db \
    DB_USER=ashaadmin@asha-db-server \
    DB_PASSWORD="YourStrongPassword123!" \
    DB_HOST=asha-db-server.postgres.database.azure.com \
    DB_PORT=5432 \
    EMAIL_HOST=smtp.office365.com \
    EMAIL_PORT=587 \
    EMAIL_USE_TLS=True \
    EMAIL_HOST_USER=your-email@kpals.org \
    EMAIL_HOST_PASSWORD="your-app-password" \
    CORS_ALLOWED_ORIGINS="https://asha-web.azurewebsites.net" \
    ALLOWED_HOSTS="asha-api.azurewebsites.net" \
    OTP_EXPIRY_MINUTES=10

# Enable continuous deployment from registry
az webapp deployment container config \
  --name asha-api \
  --resource-group asha-rg \
  --enable-cd true

# Get webhook URL
az webapp deployment container show-cd-url \
  --name asha-api \
  --resource-group asha-rg
```

Add the webhook URL to your Azure Container Registry to auto-deploy when image is pushed.

### Step 4: Create Frontend App Service

```bash
# Create App Service for frontend
az webapp create \
  --resource-group asha-rg \
  --plan asha-plan \
  --name asha-web \
  --deployment-container-image-name asharegistry.azurecr.io/asha-frontend:latest

# Configure container registry
az webapp config container set \
  --name asha-web \
  --resource-group asha-rg \
  --docker-custom-image-name asharegistry.azurecr.io/asha-frontend:latest \
  --docker-registry-server-url https://asharegistry.azurecr.io \
  --docker-registry-server-user <AZURE_REGISTRY_USERNAME> \
  --docker-registry-server-password <AZURE_REGISTRY_PASSWORD>

# Enable continuous deployment
az webapp deployment container config \
  --name asha-web \
  --resource-group asha-rg \
  --enable-cd true

# Get webhook URL and add to ACR
az webapp deployment container show-cd-url \
  --name asha-web \
  --resource-group asha-rg
```

### Step 5: Deploy

Push to the main branch:

```bash
git push origin main
```

GitHub Actions will automatically:
1. Build backend Docker image
2. Build frontend Docker image
3. Push to Azure Container Registry
4. Azure App Services auto-redeploy

**That's it!** Your app will be live at:
- **Backend**: `https://asha-api.azurewebsites.net`
- **Frontend**: `https://asha-web.azurewebsites.net`

---

## Manual Deployment (if GitHub Actions fails)

### Option 1: Direct from ACR

Push images manually:

```bash
docker build -f Dockerfile.backend -t asharegistry.azurecr.io/asha-backend:latest .
docker login -u <username> -p <password> asharegistry.azurecr.io
docker push asharegistry.azurecr.io/asha-backend:latest
```

### Option 2: Deploy from Local

```bash
az webapp up \
  --resource-group asha-rg \
  --plan asha-plan \
  --name asha-api \
  --docker-from-config
```

---

## Database Setup

Run migrations on your deployed backend:

```bash
# Restart app (triggers migrations in Dockerfile.backend CMD)
az webapp restart --resource-group asha-rg --name asha-api

# Create superuser
az webapp ssh --resource-group asha-rg -n asha-api
# Then run: python manage.py createsuperuser
```

---

## Monitoring & Logs

```bash
# Stream live logs
az webapp log stream --resource-group asha-rg --name asha-api

# View deployment logs
az webapp deployment logs list --resource-group asha-rg --name asha-api

# Restart app
az webapp restart --resource-group asha-rg --name asha-api
```

---

## Estimated Costs (Azure Pricing 2026)

- **App Service Plan (S1)**: ~$60-70/month
- **PostgreSQL (B_Gen5_1)**: ~$35-40/month
- **Container Registry (Basic)**: ~$5/month
- **Storage**: ~$1-2/month

**Total**: ~$100-115/month

---

## Scaling Up (when you grow)

### Upgrade App Service Plan

```bash
az appservice plan update \
  --name asha-plan \
  --resource-group asha-rg \
  --sku S2  # or P1V2 for production
```

### Enable Auto-scaling

```bash
az monitor autoscale create \
  --resource-group asha-rg \
  --resource asha-plan \
  --resource-type "Microsoft.Web/serverfarms" \
  --min-count 1 \
  --max-count 10 \
  --count 2
```

### Upgrade Database

```bash
az postgres server update \
  --resource-group asha-rg \
  --name asha-db-server \
  --sku-name GP_Gen5_4
```

---

## Troubleshooting

### App won't start

```bash
# Check logs
az webapp log tail --resource-group asha-rg --name asha-api --lines 100

# Restart
az webapp restart --resource-group asha-rg --name asha-api
```

### Database connection error

```bash
# Allow Azure services through firewall
az postgres server firewall-rule create \
  --resource-group asha-rg \
  --server-name asha-db-server \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Image not updating

Clear App Service cache and redeploy:

```bash
az webapp restart --resource-group asha-rg --name asha-api
# Then push a new commit to trigger GitHub Actions
```

---

## Cleanup (delete everything)

```bash
az group delete --name asha-rg --yes
```

---

## Next Steps (When Ready for Phase 2+)

- Add custom domain name
- SSL certificate (automatic)
- CDN for static files
- Application Insights monitoring
- Backup strategy

---

For help: https://learn.microsoft.com/azure/ or contact info@kpals.org
