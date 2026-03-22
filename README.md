# Asha - Donor Management System for KPALS

A comprehensive donation management system built with Python Django, React, and PostgreSQL. Designed for KPALS (Kioch Partners of America) to manage donors, donations, and tax receipts.

## Features

### Admin Features
- **Donor Management**: Create, read, update, and delete donor records
  - Track donor information: name, email, phone, address
  - Categorize donors (one-time, recurring, major, sustaining member)
  - Monitor donation history and totals
- **Donation Management**: Record and track donations
  - Support for one-time and recurring donations
  - Track donation source, date, and reference number
  - Filter donations by date range, campaign, and tax year
- **Analytics & Reporting**: Comprehensive dashboards
  - View donation trends over time (month/year/custom range)
  - Export donation records to CSV/PDF
  - Generate donor statistics and insights
- **Tax Receipt Management**: Automated tax receipt generation
  - Customizable email templates
  - Bulk tax receipt generation by tax year
  - Email delivery tracking
- **Campaign Tracking**: Tag donations to specific campaigns/funds
- **Batch Import**: Import donors and donations from CSV files
- **Audit Logs**: Track all changes made by admins

### Donor Features
- **OTP Login**: Secure email-based one-time password authentication
- **Self-Service Portal**: View personal information and donation history
- **Download Tax Receipts**: Access and download tax receipts as PDF
- **Profile Management**: Update contact information
- **Communication Preferences**: Opt-in/out of emails and newsletters

## Tech Stack

**Backend:**
- Python 3.12+
- Django 4.2
- Django REST Framework
- PostgreSQL 18+
- JWT Authentication (djangorestframework-simplejwt)

**Frontend:**
- React 18
- Material-UI
- Chart.js for analytics
- Axios for API calls
- React Hook Form for form management

**Deployment:**
- Docker & Docker Compose
- Microsoft Azure (Container Instances, App Service)
- GitHub Actions for CI/CD
- nginx for reverse proxy

**Email:**
- Microsoft 365 SMTP integration

## Project Structure

```
asha/
├── backend/
│   ├── apps/
│   │   ├── donors/              # Donor management
│   │   ├── donations/           # Donation tracking
│   │   ├── authentication/      # Auth & OTP
│   │   ├── tax_receipts/        # Tax receipt system
│   │   └── core/                # Shared utilities
│   ├── config/                  # Django settings
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.js
│   └── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 13+ (for production)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/kpals/asha.git
cd asha
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm start
```

4. **Using Docker Compose**
```bash
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# Admin: http://localhost:8000/admin
```

## Database Schema

### Models
- **Donor**: Store donor information and metadata
- **Donation**: Track individual donations with relationships to donors and campaigns
- **Campaign**: Manage fundraising campaigns/funds
- **TaxReceipt**: Store generated tax receipts
- **TaxReceiptTemplate**: Customizable email templates for tax receipts
- **OTPToken**: One-time passwords for donor login
- **DonorSession**: Track donor login sessions
- **AdminUser**: Admin user accounts
- **DonorAuditLog**: Audit trail of donor record changes

## API Endpoints

### Authentication
- `POST /api/v1/auth/send-otp/` - Send OTP to email
- `POST /api/v1/auth/verify-otp/` - Verify OTP and get JWT tokens
- `POST /api/v1/auth/admin-login/` - Admin login

### Donors
- `GET/POST /api/v1/donors/` - List and create donors
- `GET/PUT/DELETE /api/v1/donors/{id}/` - Get, update, delete donor
- `GET /api/v1/donors/statistics/` - Donor statistics
- `POST /api/v1/donors/{id}/mark_inactive/` - Mark donor as inactive

### Donations
- `GET/POST /api/v1/donations/` - List and create donations
- `GET /api/v1/donations/statistics/` - Donation statistics
- `GET /api/v1/donations/by_month/` - Donations grouped by month
- `POST /api/v1/donations/import_csv/` - Import donations from CSV

### Tax Receipts
- `GET/POST /api/v1/tax-receipts/receipts/` - List and view receipts
- `POST /api/v1/tax-receipts/receipts/generate_for_year/` - Generate receipts
- `POST /api/v1/tax-receipts/receipts/send_bulk_emails/` - Send receipt emails
- `GET /api/v1/tax-receipts/templates/` - Manage email templates

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Django
DEBUG=False
SECRET_KEY=your-secret-key

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=asha_db
DB_USER=asha_user
DB_PASSWORD=your-password
DB_HOST=localhost

# Email (Microsoft 365)
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@kpals.org
EMAIL_HOST_PASSWORD=your-app-password

# OTP
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

## Deployment to Azure

### Simple Approach (Recommended for Phase 1)

Uses **Azure App Service** with GitHub integration. No infrastructure-as-code needed.

1. Follow the [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) guide (5 simple steps, ~15 minutes)
2. GitHub Actions automatically builds & pushes Docker images when you push to main
3. Azure App Service auto-deploys the containers

**That's it!** No Terraform, no DevOps expertise needed.

### Costs
- ~$100-115/month (backend, frontend, database, registry)
- Includes automatic backups and high availability

See [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) for detailed instructions and troubleshooting.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or support, please contact: info@kpals.org

## Roadmap

### Phase 1 (Current)
- ✅ Core donor and donation management
- ✅ Admin authentication
- ✅ Donor OTP login
- ✅ Tax receipt system
- ✅ Analytics and reporting
- ✅ Email integration

### Phase 2 (Planned)
- [ ] Impact reports for donors
- [ ] Communication logs
- [ ] SMS OTP option
- [ ] Advanced analytics (cohort analysis, retention)
- [ ] Matching gifts tracking
- [ ] Recurring donation scheduling

### Phase 3 (Future)
- [ ] Online payment integration (Stripe/PayPal)
- [ ] Mobile app
- [ ] Form 990 export
- [ ] Multi-organization support
- [ ] Webhook integrations

---

Built with ❤️ for KPALS
