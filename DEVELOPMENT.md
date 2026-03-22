# Development Setup Guide

## Backend Development

### 1. Create Virtual Environment

Ensure Python 3.12+ is installed, then:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file with your configuration (especially email and database settings).

### 4. Run Migrations

```bash
python manage.py migrate
```

### 5. Create Superuser

```bash
python manage.py createsuperuser
```

### 6. Run Development Server

```bash
python manage.py runserver
```

Backend will be available at: http://localhost:8000

### 7. Access Admin Panel

Navigate to: http://localhost:8000/admin

Log in with your superuser credentials.

## Frontend Development

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure API Endpoint

Create `.env` file in frontend directory:

```
REACT_APP_API_URL=http://localhost:8000/api/v1
```

### 3. Run Development Server

```bash
npm start
```

Frontend will be available at: http://localhost:3000

## Using Docker Compose

For an easier development experience with all services:

```bash
docker-compose up --build
```

This will start:
- PostgreSQL database on port 5432
- Django API on http://localhost:8000
- React app on http://localhost:3000
- Nginx reverse proxy for API requests

Access points:
- Frontend: http://localhost:3000
- Admin: http://localhost:8000/admin
- API: http://localhost:8000/api/v1

## Database

### Connect to PostgreSQL

```bash
psql -h localhost -U asha_user -d asha_db
```

### Create Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Load Sample Data

```bash
python manage.py shell

# In the shell:
from apps.donors.models import Donor, Campaign
from apps.donations.models import Donation
from datetime import date

# Create a sample donor
donor = Donor.objects.create(
    name="John Doe",
    email="john@example.com",
    phone="555-1234",
    address="123 Main St",
    city="Boston",
    state="MA",
    zip_code="02101",
    category="one_time"
)

# Create a campaign
campaign = Campaign.objects.create(
    name="Children's Health Initiative 2024",
    description="Support KIOCH's mission",
    goal_amount=100000.00,
    start_date=date(2024, 1, 1)
)

# Create a donation
donation = Donation.objects.create(
    donor=donor,
    campaign=campaign,
    amount=500.00,
    donation_date=date(2024, 1, 15),
    donation_type="one_time",
    source="check",
    tax_year=2024
)

exit()
```

## API Testing

### Using cURL

```bash
# Get OTP
curl -X POST http://localhost:8000/api/v1/auth/send-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email": "donor@example.com"}'

# List donors (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/donors/
```

### Using Postman

1. Open Postman
2. Import API collection from: `/backend/postman_collection.json`
3. Set environment variables in Postman
4. Start making requests

## Testing

### Run Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.donors

# Run with coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

### Frontend Tests

```bash
npm test
```

## Code Style

### Backend (PEP 8)

```bash
# Check code style
pip install flake8
flake8 .

# Auto-format code
pip install black
black .
```

### Frontend (ESLint)

```bash
# Check code style
npm run lint

# Fix issues automatically
npm run lint:fix
```

## Common Commands

### Django Management

```bash
# Create new app
python manage.py startapp app_name

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Access shell
python manage.py shell

# Run management command
python manage.py <command>
```

### npm/Frontend

```bash
# Install dependency
npm install package-name

# Update dependencies
npm update

# Build for production
npm run build

# Clean up cache
npm cache clean --force
```

### Docker

```bash
# View logs
docker-compose logs backend
docker-compose logs frontend

# Run command in service
docker-compose exec backend python manage.py shell

# Rebuild services
docker-compose up --build

# Stop services
docker-compose down

# Remove volumes (delete data)
docker-compose down -v
```

## Useful Development Tools

### Django Extensions

```bash
# Graph models (requires graphviz)
python manage.py graph_models > models.png

# Shell Plus (better Django shell)
python manage.py shell_plus
```

### Database

```bash
# Dump data
python manage.py dumpdata > data.json

# Load data
python manage.py loaddata data.json
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 8000 (macOS/Linux)
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Windows: use Resource Monitor to kill process
```

### Database Connection Error

```bash
# Check if PostgreSQL is running
psql --version

# Verify connection
psql -h localhost -U asha_user
```

### Module Not Found

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### CORS Issues

Make sure frontend URL is in CORS_ALLOWED_ORIGINS in .env:

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

For more help, check the main README.md or contact the team at info@kpals.org
