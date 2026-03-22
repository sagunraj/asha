<!--
Project: Asha - Donor Management System for KPALS
Framework: Django + React
Deployment: Microsoft Azure
Status: Development Phase 1
-->

# Asha Project Instructions

These instructions guide the development and maintenance of the Asha donation management system.

## Project Overview

**Asha** (Hope in Nepali) is a comprehensive donor and donation management system built for KPALS (Kioch Partners of America), a 501(c)(3) nonprofit supporting children's health in Nepal.

### Core Features
1. **Admin Dashboard** - Donor management, donation tracking, and analytics
2. **Donor Portal** - Self-service access with OTP authentication
3. **Tax Receipt System** - Automated email generation and delivery
4. **Reporting & Analytics** - Donation trends, exports, and insights
5. **Email Integration** - Microsoft 365 SMTP for OTP and receipts

## Project Structure

```
asha/
├── backend/                 # Django REST API
│   ├── apps/
│   │   ├── donors/         # Donor management models & views
│   │   ├── donations/      # Donation tracking
│   │   ├── authentication/ # OTP & JWT auth
│   │   ├── tax_receipts/   # Tax receipt generation
│   │   └── core/           # Utilities, helpers, common code
│   ├── config/             # Django settings & URLs
│   └── requirements.txt    # Python dependencies
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Full page components
│   │   └── services/      # API integration
│   └── package.json
├── azure/                  # Infrastructure as Code (Terraform)
├── .github/workflows/      # CI/CD pipelines
└── Documentation files    # README, DEVELOPMENT, AZURE_DEPLOYMENT
```

## Development Guidelines

### Code Style
- **Backend**: Follow PEP 8 style guide
- **Frontend**: Use React best practices and Material-UI components
- **Both**: Use clear naming, comprehensive docstrings, and comments for complex logic

### API Design
- RESTful endpoints with proper HTTP methods
- Consistent response formatting with success/error fields
- Pagination for list endpoints (default: 50 items/page)
- Authentication via JWT tokens
- CORS configured for frontend domain

### Database Models
Key models to understand:
- `Donor` - Core donor information with categorization
- `Donation` - Individual donation records linked to donors
- `Campaign` - Fundraising campaigns/funds
- `TaxReceipt` - Generated tax receipts with email tracking
- `OTPToken` - One-time passwords for donor login
- `DonorAuditLog` - Audit trail of all donor changes

### Frontend Components
Build with Material-UI:
- Forms for donor/donation data entry
- Tables for listing donors/donations with search/filter
- Charts (Chart.js) for analytics dashboards
- Modal dialogs for confirmations and editing
- Responsive design for mobile/tablet/desktop

## Key Workflows

### Donor Login (OTP)
1. Donor enters email → `POST /api/v1/auth/send-otp/`
2. OTP sent via Microsoft 365 email
3. Donor enters OTP → `POST /api/v1/auth/verify-otp/`
4. JWT tokens returned for subsequent requests

### Admin Functions
1. Create/Import Donors → `POST /api/v1/donors/` or CSV import
2. Record Donations → `POST /api/v1/donations/`
3. Generate Tax Receipts → `POST /api/v1/tax-receipts/receipts/generate_for_year/`
4. Send Receipt Emails → `POST /api/v1/tax-receipts/receipts/send_bulk_emails/`

### Reporting
1. View donation trends → Admin Dashboard (line chart by date)
2. Filter by date range/campaign/donor category
3. Export records → CSV or PDF format

### Email System
- **OTP Email**: Sent via `send_otp_email()` in `apps.core.email_utils`
- **Tax Receipts**: Sent via `send_tax_receipt_email()` with custom templates
- **Provider**: Microsoft 365 SMTP (configured via .env)

## Environment Setup

### Local Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm start

# Or use Docker Compose
docker-compose up
```

### Environment Variables
Configure in `.env`:
- `DEBUG`: False in production
- `SECRET_KEY`: Django secret
- `DB_*`: PostgreSQL credentials
- `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`: M365 credentials
- `CORS_ALLOWED_ORIGINS`: Frontend URL
- `JWT_SECRET_KEY`: For token signing

## Testing

### Backend
```bash
python manage.py test                    # Run all tests
python manage.py test apps.donors        # Run app-specific tests
coverage run --source='.' manage.py test # With coverage
```

### Frontend
```bash
npm test                      # Run tests
npm run test:coverage         # With coverage report
```

## Deployment

### Azure Deployment
- **Method 1**: Terraform (Infrastructure as Code)
  ```bash
  cd azure
  terraform init
  terraform plan
  terraform apply
  ```

- **Method 2**: Manual Azure CLI commands
  See `AZURE_DEPLOYMENT.md` for detailed steps

- **Method 3**: GitHub Actions
  Push to `main` branch → automatic CI/CD pipeline

### Docker
```bash
docker-compose up --build        # Local dev
docker build -f Dockerfile.backend .  # Build image
docker push <registry>/asha-backend    # Push to registry
```

## Common Tasks

### Add New API Endpoint
1. Create serializer in `apps/<app>/serializers.py`
2. Create viewset in `apps/<app>/views.py`
3. Register in `apps/<app>/urls.py`
4. Update REST Framework router

### Add New Database Model
1. Define in `apps/<app>/models.py`
2. Run `python manage.py makemigrations`
3. Run `python manage.py migrate`
4. Register in `apps/<app>/admin.py` if needed

### Create Frontend Page
1. Create page component in `frontend/src/pages/`
2. Create route in `frontend/src/App.js`
3. Add navigation link in header/menu
4. Implement form/table components

### Configure Email Template
1. Go to `/admin/` → Tax Receipt Templates
2. Create new template with HTML content
3. Use placeholders: `{{donor_name}}`, `{{amount}}`, `{{tax_year}}`, `{{organization_name}}`
4. Set as default or select when sending

## Performance Considerations

- Database indexes on frequently filtered fields (email, created_at, tax_year)
- Pagination for large result sets
- Query optimization with `select_related()` and `prefetch_related()`
- Frontend lazy loading for tables and charts
- Caching for analytics queries

## Security

- JWT tokens with 24-hour expiry
- OTP expiry after 10 minutes
- HTTPS/TLS enforced in production
- CORS restricted to trusted domains
- SQL injection prevention (ORM usage)
- CSRF protection enabled
- Secure password hashing (bcrypt/argon2)
- No sensitive data in logs

## Troubleshooting

### Database Connection Errors
```bash
# Check PostgreSQL
psql -h localhost -U asha_user -d asha_db
```

### Migration Issues
```bash
# Rollback migration
python manage.py migrate apps.donors 0001

# Check migration status
python manage.py showmigrations
```

### Email Not Sending
- Verify Microsoft 365 credentials in `.env`
- Check if app password is enabled (not just account password)
- Verify sender email matches EMAIL_HOST_USER
- Check logs for SMTP errors

### CORS Issues
- Add frontend URL to `CORS_ALLOWED_ORIGINS` in `.env`
- Restart backend server after changing

## Resources

- Django Documentation: https://docs.djangoproject.com/
- Django REST Framework: https://www.django-rest-framework.org/
- React Documentation: https://react.dev/
- Azure Documentation: https://learn.microsoft.com/azure/
- PostgreSQL: https://www.postgresql.org/docs/

## Contact

- Email: info@kpals.org
- GitHub: https://github.com/kpals/asha
- Issues: Create GitHub issues for bugs/features

## License

MIT License - See LICENSE file

---

**Last Updated**: March 2024
**Version**: 0.1.0
**Status**: Development Phase 1
