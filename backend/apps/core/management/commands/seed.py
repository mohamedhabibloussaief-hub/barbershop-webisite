"""
Management command wrapper around scripts/seed.py.

Usage (the simple way — works on all platforms):
    docker-compose exec backend python manage.py seed

No TTY tricks, no file copying, no stdin redirection needed.
"""

import os
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed the database with Hazem Coiff demo data'

    def handle(self, *args, **options):
        # Execute the seed script in the current Django context
        seed_path = os.path.join(
            os.path.dirname(__file__),          # .../commands/
            '..', '..', '..', '..', '...',      # up to /app/
            'scripts', 'seed.py'
        )
        seed_path = os.path.normpath(seed_path)

        if not os.path.exists(seed_path):
            self.stderr.write(f'seed.py not found at: {seed_path}')
            return

        with open(seed_path) as f:
            exec(f.read(), {'__name__': '__main__'})
