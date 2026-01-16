# Fatora - Application de Gestion

Application mobile et web pour la gestion de factures, articles, clients et stock.

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Lancement en développement
npm run dev

# Build web
npm run build:web
```

## 📋 Fonctionnalités

### ✅ Gestion de Stock
- Liste des articles avec recherche
- Ajout/modification d'articles
- Scanner de codes-barres (avec fallback saisie manuelle)
- Alertes stock faible
- Historique des mouvements

### ✅ Facturation
- Création de factures
- Gestion des clients
- Suivi des paiements (partiel/total)
- Historique des factures
- Export PDF

### ✅ Administration
- Gestion des utilisateurs
- Codes d'activation
- Statistiques
- Paramètres

### ✅ Multi-plateforme
- iOS
- Android
- Web (responsive)

## 🏗️ Architecture

```
project/
├── app/                    # Routes Expo Router
│   ├── (tabs)/            # Navigation principale
│   ├── admin/             # Panneau admin
│   ├── auth/              # Authentification
│   ├── invoice/           # Facturation
│   ├── stock/             # Gestion stock
│   └── test.tsx           # Tests rapides (dev)
├── components/            # Composants réutilisables
│   ├── ui/               # Composants UI de base
│   └── BarcodeScanner.tsx # Scanner
├── lib/                   # Bibliothèques
│   ├── supabase/         # Client Supabase + Auth
│   ├── i18n/             # Internationalisation
│   └── theme/            # Thème et couleurs
└── assets/               # Images et ressources
```

## 🔧 Technologies

- **Framework:** Expo + React Native
- **Routing:** Expo Router
- **Base de données:** Supabase
- **UI:** React Native + Lucide Icons
- **État:** React Context
- **Styling:** StyleSheet

## 📱 Tests

### Tests Rapides (Mode Dev)
1. Ouvrir l'app
2. Aller dans Paramètres
3. Cliquer sur "🧪 Tests Rapides (Dev)"
4. Tester toutes les fonctionnalités

### Tests Manuels
Voir `DEPLOYMENT_GUIDE.md` pour la checklist complète.

## 🌐 Déploiement Web

### Vercel (Recommandé)
```bash
vercel --prod
```

### Netlify
```bash
netlify deploy --prod
```

Voir `DEPLOYMENT_GUIDE.md` pour les instructions détaillées.

## 🔐 Configuration

Créer un fichier `.env` :
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 📖 Documentation

- [Guide de Déploiement](./DEPLOYMENT_GUIDE.md)
- [Cahier des Charges](./QUICK_START.md)
- [Tests](./TEST_GUIDE.md)

## 👥 Rôles

### User
- Gestion des articles
- Création de factures
- Suivi des clients
- Statistiques personnelles

### Admin
- Toutes les fonctionnalités User
- Gestion des utilisateurs
- Codes d'activation
- Paramètres globaux

## 📞 Support

Pour toute question ou problème, consultez le `DEPLOYMENT_GUIDE.md` section Troubleshooting.

## 📄 Licence

Propriétaire - Tous droits réservés
