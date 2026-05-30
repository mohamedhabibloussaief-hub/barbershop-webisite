# Barber Shop Platform — Development Roadmap

> Stack: PostgreSQL 16 · Django 5 · React 18 · Docker · Nginx · OVH

---

## Phase 0 — Tools & Environment Setup
> Before you write a single line of code

### Install on your machine

| Tool | Version | Purpose |
|---|---|---|
| Docker Desktop | latest | Runs the whole stack in containers |
| Python | 3.12 (via pyenv) | Django runtime |
| Node.js | 20 LTS (via nvm) | React runtime |
| VS Code | latest | Editor — add Python, ESLint, Prettier, REST Client, GitLens |
| Git + GitHub | latest | Version control — push every day |
| Postman | latest | Test API endpoints without touching the frontend |

### Folder structure

```
barbershop/
├── backend/          # Django project
├── frontend/         # React project
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```

### .gitignore (add from day one)

```
*.env
__pycache__/
node_modules/
.DS_Store
*.pyc
dist/
```

---

## Phase 1 — Database Design & PostgreSQL
> Week 1

### Tech used

- PostgreSQL 16 (Docker container)
- DBeaver or pgAdmin (GUI client)

### Core tables

#### `users`
```
id, email, password_hash, full_name, phone,
role (client | barber | admin), created_at
```

#### `services`
```
id, name, description, price, duration_minutes, is_active
```

#### `employees`
```
id, user_id (FK → users), bio, specialties,
years_experience, is_active
```

#### `schedules`
```
id, employee_id (FK → employees),
day_of_week (0–6), start_time, end_time, is_active
```

#### `time_off`
```
id, employee_id (FK → employees),
date, reason (vacation | break | sick)
```

#### `appointments`
```
id, client_id (FK → users), employee_id (FK → employees),
service_id (FK → services), start_time, end_time,
status (pending | confirmed | arrived | completed | no_show | cancelled),
notes, created_at
```

#### `reviews`
```
id, appointment_id (FK → appointments),
rating (1–5), comment, created_at
```

### Steps

1. Write the `docker-compose.yml` with just the `db` service. Run `docker-compose up -d db`.
2. Connect with DBeaver at `localhost:5432`. Create database `barbershop_db`.
3. Draw the ER diagram (draw.io or paper). Validate all foreign keys before writing Django models.
4. Seed test data: 2 employees, 5 services, 10 appointments — you'll need this to test the backend.

> **Warning:** The `appointments` table is the heart of everything. Agree on the status values before writing a single migration.

---

## Phase 2 — Django Backend (function by function)
> Week 2–3

### Tech used

```
Django 5
djangorestframework
djangorestframework-simplejwt
django-cors-headers
psycopg2-binary
python-decouple
```

Install with:
```bash
pip install django djangorestframework djangorestframework-simplejwt \
  django-cors-headers psycopg2-binary python-decouple
```

### Build in this exact order

**1. Project scaffold**
```bash
cd backend
django-admin startproject config .
```
Configure `settings.py` to read from `.env` using `python-decouple`. Connect to PostgreSQL. Run `python manage.py migrate`.

**2. Custom User model**

Create app `users`. Extend `AbstractBaseUser` with a `role` field.
Do this **before any other migration** — you cannot change it later without resetting the DB.

**3. Auth endpoints**
```
POST /api/auth/register/
POST /api/auth/login/      → returns access + refresh JWT
POST /api/auth/refresh/
```
Test all three in Postman before moving on.

**4. Services CRUD**

Create app `services`. Use a `ModelViewSet`. Anyone can read; only admins can write.

**5. Employee profiles & schedules**

Create app `employees`. Models: `Employee`, `Schedule`, `TimeOff`. Endpoints to set working hours and mark days off.

**6. Availability logic**

The most critical function in the whole app:
```
GET /api/availability/?employee=<id>&date=<YYYY-MM-DD>&service=<id>
```
Returns free time slots by subtracting booked appointments from the employee's schedule.

**7. Appointments CRUD**

Create app `appointments`. Endpoints: create, list (filtered by role), cancel, update status.
Block double-booking inside the serializer's `validate()` method — not just in the view.

**8. Email notifications**

Use Django's built-in email backend with SendGrid or Mailgun SMTP. Trigger emails on:
- Booking created (confirmation to client)
- Booking cancelled
- 24h reminder (use a cron job or Celery + Redis for V1)

**9. Reviews**
```
POST /api/reviews/
```
Only allowed if appointment status is `completed`. One review per appointment, enforced at the model level.

**10. Analytics endpoints (admin only)**

Use Django ORM aggregations — no raw SQL needed.
- Revenue by day / month
- Appointments per employee
- Cancellation rate
- Most booked services

> **Note:** Add `django-cors-headers` and configure `CORS_ALLOWED_ORIGINS` from day one. Without it, React will get mysterious blocked-request errors.

---

## Phase 3 — React Frontend (portal by portal)
> Week 4–6

### Tech used

```
React 18 + Vite
React Router v6
TanStack Query (data fetching + caching)
React Hook Form (forms + validation)
Axios (HTTP client + JWT interceptor)
Day.js (date handling)
Tailwind CSS (styling)
Recharts (admin analytics charts)
```

Bootstrap the project:
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom @tanstack/react-query react-hook-form axios dayjs recharts
npx tailwindcss init
```

### Build in this order

**1. Project scaffold**

Set up React Router. Create an `axios` instance with base URL and a request interceptor that attaches the JWT token to every request.

**2. Auth context**

Global context that stores: JWT token, current user object, role. After login, redirect to the correct portal based on role.

**3. Client portal** (most visible — build first)

```
/                     Landing page (hero, services, team, reviews, hours, Book Now)
/services             Services list with price + duration
/book                 4-step booking wizard:
                        Step 1 → choose service
                        Step 2 → choose employee (optional)
                        Step 3 → pick available date
                        Step 4 → confirm
/appointments         My upcoming + past appointments (cancel / reschedule)
/profile              Personal info, phone, notification preferences
```

**4. Employee portal**

```
/employee/dashboard   Today's schedule, next client, earnings
/employee/calendar    Set working hours, mark days off, vacations
/employee/appointments  Mark arrived / completed / no-show / cancelled
```

**5. Admin portal**

```
/admin/dashboard      Overview stats
/admin/employees      Add / edit / deactivate employees
/admin/services       Manage services and pricing
/admin/appointments   All appointments, modify or reassign
/admin/analytics      Revenue charts, employee performance (Recharts)
```

> **Security:** Store the JWT in memory or an `httpOnly` cookie — never in `localStorage`. This is the most common beginner security mistake.

---

## Phase 4 — Local Integration (run everything together)
> Week 6–7

### Tech used

- Docker Compose (all services)
- Nginx (local reverse proxy)
- `.env` files for environment variables

### `docker-compose.yml` services

```yaml
services:
  db:
    image: postgres:16-alpine
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    env_file: .env
    depends_on:
      - db
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000

  frontend:
    build: ./frontend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
```

### Nginx routing rule

```nginx
location /api/ {
    proxy_pass http://backend:8000;
}
location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
}
```

### Integration checklist (run all before moving on)

- [ ] Client can register, log in, and book an appointment end-to-end
- [ ] Employee sees the booking appear and can accept it
- [ ] Admin can add a service and an employee, and they appear in the client portal
- [ ] Email confirmation is received after booking
- [ ] Double-booking the same slot is rejected by the API
- [ ] `docker-compose up --build` works from a clean clone on a different machine

---

## Phase 5 — Owner Demo Meeting
> Week 8 · Run locally on your laptop

### Prepare before the meeting

1. **Seed real data** — use the actual salon's service names, employee names, and real pricing. It makes the demo feel real.
2. **Create 3 demo accounts** — `client@demo.com`, `barber@demo.com`, `admin@demo.com`, all with a simple password.
3. **Rehearse the booking flow** — book as the client, then switch to the employee view live to show the appointment appearing. This is the moment that always impresses owners.
4. **Show the admin dashboard** — revenue chart, employee list, service management. Owners care most about control and visibility.
5. **Bring a notebook** — write down every comment. Do not fix anything during the meeting. Prioritize feedback afterwards.

> **Rule:** Only move to production after this meeting. No point paying for hosting before the owner says "yes, this is what I want."

---

## Phase 6 — Production Deployment on OVH
> Week 9–10 · Only after the owner demo

### Tech used

- OVH VPS — Ubuntu 22.04, minimum 2GB RAM
- Domain name + SSL certificate (already purchased)
- Nginx (production config)
- Docker Compose (same file, production overrides)
- GitHub Actions (optional, for automated deploy)

### Steps

**1. Provision the VPS**
```bash
# On the OVH server after SSH in
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
```

**2. Point domain DNS**

Add an A record pointing to your VPS IP address. Wait for propagation (up to 24h). Verify:
```bash
nslookup yourdomain.com
```

**3. Configure SSL**

Upload your `.crt` and `.key` files to the server. Add to Nginx:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    ssl_certificate     /etc/ssl/yourdomain.crt;
    ssl_certificate_key /etc/ssl/yourdomain.key;
    ...
}
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

**4. Set production `.env`**

```env
DEBUG=False
SECRET_KEY=<long-random-string>
ALLOWED_HOSTS=yourdomain.com
DB_NAME=barbershop_db
DB_USER=postgres
DB_PASSWORD=<strong-password>
DB_HOST=db
DB_PORT=5432
EMAIL_HOST=smtp.sendgrid.net
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<sendgrid-api-key>
```

**5. Deploy**
```bash
git clone https://github.com/youruser/barbershop.git
cd barbershop
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

**6. Smoke test**

- Open the domain in a browser
- Book an appointment as a client
- Confirm the email arrives
- Check Django admin at `yourdomain.com/admin`

**7. Set up daily DB backups**
```bash
# Add to crontab (crontab -e)
0 2 * * * docker exec barbershop_db_1 pg_dump -U postgres barbershop_db | gzip > /backups/backup_$(date +%F).gz
```

> **Warning:** Set up backups before going live. Store copies off the server (e.g. OVH Object Storage or an external drive).

---

## Quick reference — what's optional for V1

The following features were identified as non-essential for the first version. Add them only after the core is live and stable.

| Feature | Why skip for now |
|---|---|
| Google / phone number login | Email + password is enough to launch |
| SMS & push notifications | Email covers the essentials |
| Google Calendar sync | Nice to have, not critical |
| Online payments (Flouci / card) | "Pay at salon" removes all payment complexity |
| Queue / waiting list | Complex to implement correctly |
| Loyalty points & memberships | Post-launch feature |
| Client photo uploads | Storage + moderation overhead |
| Multi-branch support | Only needed if the salon expands |
| Conflict-resolution agent | Manual admin override is fine for V1 |
| Marketing campaigns & blacklist | Admin panel handles this manually |

---

*Roadmap version 1.0 — generated for a first-time Django + React project*
