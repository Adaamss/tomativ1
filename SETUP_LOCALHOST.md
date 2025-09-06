# Configuration Localhost - Tomati Marketplace

## Prérequis

1. **Node.js** (version 18 ou plus récente)
2. **npm** ou **yarn**
3. **PostgreSQL** (version 12 ou plus récente)
4. **Git**

## Installation

### 1. Cloner le projet
```bash
git clone <votre-repo-url>
cd tomati-marketplace
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration de la base de données PostgreSQL

#### Créer une base de données
```sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Créer la base de données
CREATE DATABASE tomati_marketplace;

-- Créer un utilisateur (optionnel)
CREATE USER tomati_user WITH ENCRYPTED PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE tomati_marketplace TO tomati_user;
```

### 4. Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
# Base de données
DATABASE_URL="postgresql://username:password@localhost:5432/tomati_marketplace"

# Sessions
SESSION_SECRET="votre_secret_session_tres_long_et_securise"

# Authentification Replit (pour dev local, créer des valeurs de test)
REPL_ID="test-localhost"
REPL_SLUG="tomati-local"
REPL_OWNER="votre-nom"
REPLIT_DOMAINS="localhost:5000"
ISSUER_URL="https://replit.com/oidc"

# Stockage d'objets (optionnel pour dev local)
# PRIVATE_OBJECT_DIR="/uploads"
# PUBLIC_OBJECT_SEARCH_PATHS="/public"

# Port (optionnel)
PORT=5000
```

### 5. Initialiser la base de données

```bash
# Pousser le schéma vers la base de données
npm run db:push
```

### 6. Lancer l'application

```bash
# Mode développement
npm run dev
```

L'application sera accessible sur : http://localhost:5000

## Configuration alternative sans Replit Auth

Si vous voulez désactiver l'authentification Replit pour le développement local, modifiez le fichier `server/routes.ts` :

```typescript
// Commentez ou modifiez les routes d'authentification
// await setupAuth(app); // Désactiver l'auth Replit

// Route de test pour dev local
app.get('/api/auth/user', (req, res) => {
  res.json({
    id: 'test-user',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  });
});
```

## Structure des fichiers

```
tomati-marketplace/
├── client/           # Frontend React
├── server/           # Backend Express
├── shared/           # Types partagés
├── package.json
├── vite.config.ts
└── .env             # Variables d'environnement
```

## Scripts disponibles

```bash
npm run dev          # Lancer en mode développement
npm run build        # Construire pour production
npm run db:push      # Mettre à jour la base de données
npm run db:generate  # Générer les migrations
```

## Résolution de problèmes

### Port déjà utilisé
```bash
# Trouver le processus utilisant le port 5000
lsof -i :5000
# Tuer le processus
kill -9 <PID>
```

### Erreurs de base de données
```bash
# Vérifier que PostgreSQL fonctionne
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux
```

### Erreurs WebSocket
En localhost, les WebSocket utilisent `ws://` au lieu de `wss://`. L'application se configure automatiquement.

## Différences avec Replit

- **Authentification** : Replit Auth ne fonctionne qu'avec les domaines Replit
- **Base de données** : Utilise PostgreSQL local au lieu de Neon
- **Stockage** : Pas de Google Cloud Storage par défaut
- **WebSocket** : Utilise `ws://` au lieu de `wss://`