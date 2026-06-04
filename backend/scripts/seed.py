"""
scripts/seed.py
---------------
Seeds the database with realistic Hazem Coiff demo data.

SAFE TO RUN if you already created a superuser via createsuperuser —
the script detects existing accounts and skips them.

Usage:
    docker-compose exec backend python manage.py shell < scripts/seed.py

Demo accounts after seeding:
    Admin   → your superuser account (already created)
    Barber  → aziz@hazemcoiff.tn    / Demo1234!
    Client  → client@demo.tn        / Demo1234!
"""

import random
from datetime import date, time, datetime, timedelta
from decimal import Decimal

from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

from apps.employees.models import Employee, Schedule, TimeOff
from apps.services.models  import Service
from apps.appointments.models import Appointment, Payment


# ── helpers ──────────────────────────────────────────────────────────────────

def make_dt(days_offset, hour, minute=0):
    d     = date.today() + timedelta(days=days_offset)
    naive = datetime(d.year, d.month, d.day, hour, minute)
    return timezone.make_aware(naive)

def get_or_create_user(email, password, full_name, phone, role):
    user = User.objects.filter(email=email).first()
    if not user:
        user = User.objects.create_user(
            email=email, password=password,
            full_name=full_name, phone=phone, role=role,
        )
        print(f'  ✓ Created {role}: {email}')
    else:
        # Ensure role is correct even if account existed
        if user.role != role and role != 'admin':
            user.role = role
            user.save(update_fields=['role'])
        print(f'  — Already exists ({user.role}): {email}')
    return user


# ════════════════════════════════════════════════════════════════
print('\n══════════════════════════════════════════')
print('  Hazem Coiff — Seed script')
print('══════════════════════════════════════════')


# ── 1. Admin role check ──────────────────────────────────────────
print('\n[1/6] Admin…')
admins = User.objects.filter(is_superuser=True)
if admins.exists():
    for a in admins:
        if a.role != 'admin':
            a.role = 'admin'
            a.save(update_fields=['role'])
        print(f'  ✓ Superuser confirmed as admin: {a.email}')
else:
    # Fallback: create one if none exists
    u = User.objects.create_superuser(
        email='admin@hazemcoiff.tn',
        password='Demo1234!',
        full_name='Admin Hazem Coiff',
    )
    u.role = 'admin'
    u.save(update_fields=['role'])
    print('  ✓ Admin created: admin@hazemcoiff.tn / Demo1234!')


# ── 2. Barbers ────────────────────────────────────────────────────
print('\n[2/6] Barbers & schedules…')

BARBERS = [
    {
        'email':            'aziz@hazemcoiff.tn',
        'full_name':        'Aziz Chaaben',
        'phone':            '+21625180013',
        'bio':              "Maître coiffeur avec 8 ans d'expérience. Spécialiste fades et barbe.",
        'specialties':      'fades, barbe, coupe classique',
        'years_experience': 8,
        'schedule': [
            (0, '12:00', '20:30'),
            (1, '09:00', '20:30'), (2, '09:00', '20:30'),
            (3, '09:00', '20:30'), (4, '09:00', '20:30'),
            (5, '09:00', '20:30'), (6, '09:00', '18:00'),
        ],
    },
    {
        'email':            'mehdi@hazemcoiff.tn',
        'full_name':        'Mehdi Belhaj',
        'phone':            '+21625150393',
        'bio':              'Styliste spécialisé en coupes modernes et soins capillaires.',
        'specialties':      'coupes modernes, kératine, coloration',
        'years_experience': 5,
        'schedule': [
            (0, '12:00', '20:30'),
            (1, '09:00', '20:30'), (2, '09:00', '20:30'),
            (3, '09:00', '20:30'), (4, '09:00', '20:30'),
            (5, '09:00', '20:30'),
        ],
    },
]

employees = []
for b in BARBERS:
    user = get_or_create_user(
        b['email'], 'Demo1234!', b['full_name'], b['phone'], 'barber'
    )
    emp, created = Employee.objects.get_or_create(
        user=user,
        defaults={
            'bio':              b['bio'],
            'specialties':      b['specialties'],
            'years_experience': b['years_experience'],
        },
    )
    if created:
        print(f'    ✓ Employee profile: {b["full_name"]}')
    if not Schedule.objects.filter(employee=emp).exists():
        for day, start, end in b['schedule']:
            Schedule.objects.create(
                employee=emp,
                day_of_week=day,
                start_time=time.fromisoformat(start),
                end_time=time.fromisoformat(end),
            )
        print(f'    ✓ Schedule set: {b["full_name"]}')
    employees.append(emp)


# ── 3. Services ───────────────────────────────────────────────────
print('\n[3/6] Services…')

SERVICES_DATA = [
    # (name, category, price, duration_minutes)
    # Le Classique
    ('Coupe',    'Le Classique', Decimal('12'),  30),
    ('Barbe',    'Le Classique', Decimal('5'),   20),
    ('Brushing', 'Le Classique', Decimal('8'),   25),
    # Le Prestige
    ('Coupe + Masque + Séchoir + Style Crème',          'Le Prestige', Decimal('15'), 50),
    ('Coupe + Barbe + Masque + Séchoir + Style Crème',  'Le Prestige', Decimal('20'), 65),
    ('Coupe + Barbe + Masque + Brushing + Style Crème', 'Le Prestige', Decimal('25'), 80),
    # Maison Skin Care
    ('Gommage (Serviette chaude)', 'Maison Skin Care', Decimal('8'),   30),
    ('Cire Épilation',             'Maison Skin Care', Decimal('5'),   20),
    ('Masque Argile',              'Maison Skin Care', Decimal('5'),   20),
    ('Soin de Visage Complet',     'Maison Skin Care', Decimal('70'),  90),
    ('Soin Hydrafacial',           'Maison Skin Care', Decimal('150'), 120),
    # Maison Soin de Cheveux
    ('Application Protéine (Complet)', 'Maison Soin de Cheveux', Decimal('120'), 120),
    ('Application Kératine (Complet)', 'Maison Soin de Cheveux', Decimal('120'), 120),
    ('Application (Sans Produit)',     'Maison Soin de Cheveux', Decimal('70'),  90),
    # The Wedding Collection
    ('Gold Edition',    'The Wedding Collection', Decimal('100'), 120),
    ('Diamond Edition', 'The Wedding Collection', Decimal('180'), 180),
    ('Royale Edition',  'The Wedding Collection', Decimal('220'), 240),
]

services = []
for name, cat, price, dur in SERVICES_DATA:
    svc, created = Service.objects.get_or_create(
        name=name,
        defaults={'category': cat, 'price': price, 'duration_minutes': dur},
    )
    if created:
        print(f'  ✓ Service: {name} ({price} DT)')
    services.append(svc)

if not any(created for *_, created in
           [Service.objects.get_or_create(name=n, defaults={})
            for n, *_ in SERVICES_DATA[:1]]):
    print(f'  — {len(services)} services already exist')


# ── 4. Demo clients ────────────────────────────────────────────────
print('\n[4/6] Demo clients…')

CLIENTS_DATA = [
    ('client@demo.tn',   'Ahmed Ben Ali',    '+21620100100'),
    ('client2@demo.tn',  'Mohamed Trabelsi', '+21620200200'),
    ('client3@demo.tn',  'Sami Gharbi',      '+21620300300'),
    ('client4@demo.tn',  'Youssef Khelifi',  '+21620400400'),
    ('client5@demo.tn',  'Karim Mansouri',   '+21620500500'),
]

clients = [
    get_or_create_user(email, 'Demo1234!', name, phone, 'client')
    for email, name, phone in CLIENTS_DATA
]


# ── 5. Appointments ────────────────────────────────────────────────
print('\n[5/6] Appointments…')

if Appointment.objects.count() >= 10:
    print('  — Appointments already seeded, skipping.')
else:
    quick  = [s for s in services if s.duration_minutes <= 30]
    medium = [s for s in services if 30 < s.duration_minutes <= 90]

    created_count = 0

    # Past completed (revenue + review data)
    past = [
        (-35, 9, 0), (-33, 10, 0), (-30, 11, 30), (-28, 14, 0),
        (-25, 9, 0), (-22, 15, 30), (-20, 10, 0), (-18, 9, 30),
        (-15, 14, 0), (-12, 11, 0), (-10, 16, 0), (-8, 9, 0),
        (-5, 10, 30), (-3, 15, 0), (-1, 11, 0),
    ]
    past_appts = []
    for i, (d, h, m) in enumerate(past):
        client = clients[i % len(clients)]
        emp    = employees[i % len(employees)]
        svc    = quick[i % len(quick)]
        start  = make_dt(d, h, m)
        end    = start + timedelta(minutes=svc.duration_minutes)
        appt   = Appointment.objects.create(
            client=client, employee=emp, service=svc,
            start_time=start, end_time=end,
            status=Appointment.Status.COMPLETED,
        )
        Payment.objects.create(
            appointment=appt, amount=svc.price,
            status=Payment.Status.PAID, method=Payment.Method.CASH,
            paid_at=end,
        )
        past_appts.append(appt)
        created_count += 1

    # A few no-shows / cancellations (analytics data)
    for i in range(4):
        svc   = quick[0]
        start = make_dt(-(i * 6 + 4), 13, 0)
        end   = start + timedelta(minutes=svc.duration_minutes)
        st    = (Appointment.Status.NO_SHOW
                 if i % 2 == 0 else Appointment.Status.CANCELLED)
        appt  = Appointment.objects.create(
            client=clients[i % len(clients)],
            employee=employees[i % len(employees)],
            service=svc, start_time=start, end_time=end, status=st,
            cancellation_reason='Client indisponible' if st == 'cancelled' else '',
        )
        Payment.objects.create(appointment=appt, amount=svc.price,
                               status=Payment.Status.PENDING)
        created_count += 1

    # Upcoming (confirmed + pending for the demo)
    future = [
        (1,  9,  0, 'confirmed'), (1,  10, 30, 'confirmed'), (1,  14, 0, 'pending'),
        (2,  9,  0, 'confirmed'), (2,  11,  0, 'pending'),
        (3,  15, 0, 'confirmed'), (3,  10, 30, 'confirmed'),
        (5,  9,  0, 'pending'),   (5,  14,  0, 'confirmed'),
        (7,  10, 0, 'confirmed'), (7,  16,  0, 'pending'),
        (9,  9, 30, 'confirmed'), (10, 11,  0, 'confirmed'),
    ]
    for i, (d, h, m, st) in enumerate(future):
        svc_pool = quick + medium
        svc      = svc_pool[i % len(svc_pool)]
        start    = make_dt(d, h, m)
        end      = start + timedelta(minutes=svc.duration_minutes)
        appt     = Appointment.objects.create(
            client=clients[i % len(clients)],
            employee=employees[i % len(employees)],
            service=svc, start_time=start, end_time=end,
            status=st,
        )
        Payment.objects.create(appointment=appt, amount=svc.price,
                               status=Payment.Status.PENDING)
        created_count += 1

    print(f'  ✓ {created_count} appointments created')

    # Reviews on past completed appointments
    from apps.reviews.models import Review
    if not Review.objects.exists():
        comments = [
            "Excellent service, résultat impeccable. Je recommande !",
            "Aziz est un vrai artiste. Ma coupe est parfaite.",
            "Très bonne ambiance, équipe professionnelle.",
            "Satisfait du résultat, je reviendrai sans hésiter.",
            "Meilleur salon de la région, sans hésitation.",
            "Service rapide et de qualité. Tarifs très raisonnables.",
            "Le soin du visage était incroyable. Peau hydratée toute la semaine !",
            "Mehdi est excellent, je suis très content de ma coupe.",
        ]
        rv_count = 0
        for i, appt in enumerate(past_appts[:8]):
            Review.objects.create(
                appointment=appt,
                employee=appt.employee,
                rating=random.choice([4, 5, 5, 5]),
                comment=comments[i % len(comments)],
            )
            rv_count += 1
        print(f'  ✓ {rv_count} reviews created')


# ── 6. Summary ────────────────────────────────────────────────────
print('\n[6/6] Summary…')

admin_account = User.objects.filter(is_superuser=True).first()

print('\n══════════════════════════════════════════')
print('  Seed complete ✓')
print()
print('  Demo accounts:')
print(f'  Admin   → {admin_account.email} (votre mot de passe superuser)')
print('  Barber  → aziz@hazemcoiff.tn    / Demo1234!')
print('  Client  → client@demo.tn        / Demo1234!')
print()
print(f'  Services : {Service.objects.count()}')
print(f'  RDV      : {Appointment.objects.count()}')
print(f'  Avis     : ', end='')
try:
    from apps.reviews.models import Review
    print(Review.objects.count())
except Exception:
    print('—')
print('══════════════════════════════════════════\n')
