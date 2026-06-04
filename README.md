# Hazem Coiff — Plateforme de gestion

> **Note :** Si vous avez déjà créé un superuser via `createsuperuser`,
> le script de seed détecte automatiquement votre compte et le configure
> comme admin. Votre mot de passe est préservé.

Plateforme de réservation et de gestion pour le salon Hazem Coiff.  
Stack : PostgreSQL 16 · Django 5 · React 18 + Vite · Docker · Nginx

---

## Démarrage rapide

### Prérequis
- Docker Desktop (Mac/Windows) ou Docker + Docker Compose (Linux)
- Git

### 1. Cloner et configurer

```bash
git clone <repo-url> hazemcoiff
cd hazemcoiff

# Copier les variables d'environnement
cp .env.example .env
# Éditer .env si nécessaire (les valeurs par défaut fonctionnent en dev)
```

### 2. Lancer la stack

```bash
docker-compose up --build
```

Première exécution : ~3-5 minutes (téléchargement des images, installation des dépendances).

### 3. Initialiser les données de démo

```bash
# Dans un autre terminal, une fois la stack démarrée
docker-compose exec backend python manage.py shell < scripts/seed.py
```

### 4. Accéder à l'application

| Service           | URL                              |
|-------------------|----------------------------------|
| Application web   | http://localhost                 |
| API Django        | http://localhost:8000/api/       |
| Django Admin      | http://localhost:8000/admin/     |
| Base de données   | localhost:5432                   |

### Comptes de démonstration

| Rôle    | Email                    | Mot de passe  |
|---------|--------------------------|---------------|
| Admin   | admin@hazemcoiff.tn      | Admin1234!    |
| Coiffeur| aziz@hazemcoiff.tn       | Barber1234!   |
| Client  | client1@demo.tn          | Client1234!   |

---

## Commandes utiles

```bash
# Arrêter la stack
docker-compose down

# Arrêter et supprimer les données (RESET complet)
docker-compose down -v

# Voir les logs en temps réel
docker-compose logs -f backend
docker-compose logs -f frontend

# Accéder au shell Django
docker-compose exec backend python manage.py shell

# Créer un superutilisateur manuellement
docker-compose exec backend python manage.py createsuperuser

# Lancer les migrations après un changement de modèle
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Re-seed la base après un reset
docker-compose exec backend python manage.py shell < scripts/seed.py
```

---

## Checklist d'intégration (Phase 4)

Vérifier manuellement chaque point avant de passer à la démo propriétaire :

- [ ] `docker-compose up --build` réussit depuis un clone propre
- [ ] http://localhost charge le formulaire de connexion
- [ ] Connexion en tant que client (client1@demo.tn) redirige vers `/`
- [ ] Connexion en tant que coiffeur (aziz@hazemcoiff.tn) redirige vers `/employee/dashboard`
- [ ] Connexion en tant qu'admin (admin@hazemcoiff.tn) redirige vers `/admin/dashboard`
- [ ] Client : réserver un RDV de bout en bout (service → coiffeur → créneau → confirmation)
- [ ] Email de confirmation affiché dans les logs : `docker-compose logs backend | grep "booking_confirmed"`
- [ ] Coiffeur : voir le RDV apparaître dans "À venir" puis "Aujourd'hui"
- [ ] Coiffeur : marquer le client comme "Arrivé" puis "Terminé"
- [ ] Client : annuler un RDV → statut passe à "Annulé"
- [ ] Admin : confirmer un RDV en attente
- [ ] Admin : créer un nouveau service → il apparaît dans le wizard de réservation
- [ ] Admin : voir le graphique de revenus dans Analytiques
- [ ] Double-réservation rejetée : tenter de réserver le même créneau deux fois
- [ ] http://localhost:8000/api/health/ répond `{"status": "ok"}`
- [ ] http://localhost:8000/admin/ charge l'interface Django Admin

---

## Architecture

```
                    Browser
                       │
                   Port 80
                       │
                  ┌────▼────┐
                  │  Nginx  │
                  └────┬────┘
              ┌────────┴────────┐
              │                 │
         /api/* /admin/*    /* (SPA)
              │                 │
        ┌─────▼─────┐    ┌──────▼──────┐
        │  Django   │    │  Vite / dist│
        │  :8000    │    │  :5173      │
        └─────┬─────┘    └─────────────┘
              │
        ┌─────▼─────┐
        │ PostgreSQL│
        │   :5432   │
        └───────────┘
```

---

## Déploiement production (OVH)

Voir Phase 6 du roadmap. En résumé :

```bash
# Sur le serveur OVH
git clone <repo> hazemcoiff && cd hazemcoiff
cp .env.example .env
# Éditer .env : DEBUG=False, SECRET_KEY fort, ALLOWED_HOSTS=votre-domaine.tn
# Placer les certificats SSL dans /etc/ssl/hazemcoiff/

docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
