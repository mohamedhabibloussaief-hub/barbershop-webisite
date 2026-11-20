# Hazem Coiff — Guide de démonstration propriétaire

> **Règle d'or :** Ne corriger rien pendant la réunion.
> Noter chaque commentaire. Prioriser après.

---

## Avant la réunion — checklist technique

Exécuter ces commandes **la veille** :

```bash
# 1. Stack propre
docker-compose down -v
docker-compose up --build -d

# 2. Attendre que tout soit healthy (30-60 secondes)
docker-compose ps
# Tous les services doivent afficher "healthy" ou "running"

# 3. Seeder les données
docker-compose exec backend python manage.py shell < scripts/seed.py

# 4. Vérifier les comptes
# Ouvrir http://localhost/login
# Se connecter en tant que client@demo.tn / Demo1234!   → portail client
# Se connecter en tant que aziz@hazemcoiff.tn / Demo1234! → portail coiffeur
# Se connecter en tant que [votre superuser]              → portail admin
```

**Checklist avant de montrer à l'owner :**

- [ ] http://localhost charge la page de connexion
- [ ] Connexion client redirige vers le tableau de bord client
- [ ] Connexion coiffeur redirige vers le tableau de bord coiffeur
- [ ] Connexion admin redirige vers le tableau de bord admin
- [ ] Au moins 3 RDV apparaissent dans "À venir" côté admin
- [ ] Le graphique de revenus affiche des données (30 derniers jours)
- [ ] La liste des services affiche les 17 services Hazem Coiff
- [ ] Ouvrir 3 onglets : un par rôle (client, coiffeur, admin)

---

## Scénario de démo — 20 minutes

### Acte 1 — Vue client (5 min)
*"Voici ce que voit votre client sur son téléphone ou ordinateur."*

**Onglet client (client@demo.tn)**

1. Montrer le tableau de bord : prochain RDV en haut, liste des visites récentes
2. Cliquer **"Réserver"** → wizard 4 étapes
   - Étape 1 : sélectionner **"Coupe"** (12 DT, 30 min)
   - Étape 2 : choisir **Aziz Chaaben**
   - Étape 3 : choisir la date de demain → sélectionner un créneau (ex. 10:00)
   - Étape 4 : confirmer → *"Réservation confirmée !"*
3. Montrer **"Mes rendez-vous"** → le nouveau RDV apparaît en statut "Confirmé"
4. *Point clé à dire :* "Le client reçoit un email de confirmation automatique."

---

### Acte 2 — Vue coiffeur (5 min)
*"Maintenant, voici ce que voit Aziz sur son téléphone."*

**Onglet coiffeur (aziz@hazemcoiff.tn)**

1. Montrer le tableau de bord : stats du jour, carte "Prochain client" en haut
2. Le RDV que le client vient de réserver apparaît dans **"Programme du jour"**
3. Cliquer **"Marquer arrivé"** → statut passe à "Arrivé"
4. Cliquer **"Terminer"** → statut passe à "Terminé"
5. Montrer **"Mon planning"** → affichage des horaires de la semaine
   - *Point clé :* "Aziz peut déclarer ses congés directement ici."
6. Ajouter un congé test : date dans 2 semaines, motif "Vacances"
   → vérifier que le créneau disparaît de la disponibilité côté client

---

### Acte 3 — Vue admin (8 min)
*"Voici votre tableau de bord en tant que gérant."*

**Onglet admin ([votre superuser])**

**Tableau de bord**
1. Montrer les 4 KPIs (revenu 30j, RDV, terminés, taux annulation)
2. Montrer les prochains RDV → "Vous voyez tout en temps réel"

**Rendez-vous**
3. Aller dans **Rendez-vous** → montrer les 4 onglets (À venir, Aujourd'hui, Terminés, Annulés)
4. Utiliser la recherche → taper "Ahmed" → filtre instantané
5. Confirmer un RDV "En attente" → cliquer "Confirmer"

**Services**
6. Aller dans **Services** → montrer les 17 services groupés par catégorie
7. Cliquer **Modifier** sur "Coupe" → changer le prix à 14 DT → Enregistrer
   - *Point clé :* "Vous gérez vous-même les prix, sans appeler un développeur."
8. Revenir au wizard de réservation côté client → le nouveau prix apparaît

**Analytiques**
9. Aller dans **Analytiques** → changer la période sur 90 jours
10. Montrer le graphique de revenus journaliers
11. Montrer le tableau des performances par coiffeur
    - *Point clé :* "Vous savez exactement qui génère le plus de chiffre d'affaires."

**Coiffeurs**
12. Aller dans **Coiffeurs** → liste avec statut actif/inactif
13. Cliquer sur une rangée pour voir le détail

---

### Points à souligner pendant toute la démo

| Fonctionnalité | Ce qu'il faut dire |
|---|---|
| Email auto | "Chaque réservation envoie un email de confirmation. Un rappel part 24h avant." |
| Double-réservation | "Il est impossible de réserver deux clients au même créneau — le système bloque." |
| Responsive | Faire tourner le téléphone en mode portrait pour montrer le menu mobile |
| Temps réel | "Quand un client réserve, Aziz voit le RDV apparaître immédiatement." |
| Prix mariage | Montrer la Wedding Collection dans les services : Gold 100 DT, Diamond 180 DT, Royale 220 DT |

---

## Questions fréquentes de l'owner — réponses préparées

**"Comment les clients réservent-ils ?"**
> Via l'appli web sur leur téléphone ou ordinateur. Pas besoin de télécharger une app.

**"Est-ce que Aziz peut gérer ses propres congés ?"**
> Oui, depuis son portail coiffeur. Il peut ajouter des absences sans passer par vous.

**"Les clients peuvent-ils annuler eux-mêmes ?"**
> Oui. L'annulation met à jour le créneau automatiquement — il redevient disponible.

**"Et si je veux ajouter un nouveau service ou changer un prix ?"**
> Vous le faites directement dans l'admin, en 10 secondes. Pas besoin de développeur.

**"Comment je sais combien j'ai gagné ce mois-ci ?"**
> Tableau Analytiques → revenus journaliers et par coiffeur, exportable.

**"C'est sécurisé ?"**
> Les mots de passe sont hachés (jamais stockés en clair). Les tokens expirent après 15 minutes. Chaque rôle ne voit que ses propres données.

**"Peut-on avoir plusieurs salons ?"**
> L'architecture le supporte (les coiffeurs et services sont partagés), mais l'interface multi-salons est prévue en V2 après validation de la V1.

---

## Après la réunion

1. Écrire **tous** les commentaires entendus pendant la démo
2. Classer par : bloquant / important / nice-to-have
3. Ne déployer en production qu'après un "oui" explicite de l'owner
4. Phase 6 = déploiement OVH

---

## Commandes d'urgence le jour J

```bash
# Stack qui ne démarre pas → reset complet
docker-compose down -v && docker-compose up --build -d
docker-compose exec backend python manage.py shell < scripts/seed.py

# Voir les erreurs en direct
docker-compose logs -f

# Vérifier que l'API répond
curl http://localhost/api/health/
# Attendu: {"status": "ok"}

# Forcer la recréation d'un service spécifique
docker-compose up -d --no-deps --build backend
```
