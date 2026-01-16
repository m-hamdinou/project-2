# 📦 Guide de Déploiement et Tests - Fatora

## ✅ Résumé des Améliorations

### 🎯 Étape 1 : Bottom Tabs Stabilisées
**Fichier modifié :** `app/(tabs)/_layout.tsx`

**Améliorations :**
- ✅ Safe area gérée sur iOS/Android/Web
- ✅ Hauteur optimale (70px base + padding + safe area)
- ✅ Ombre/élévation pour "relever" les tabs
- ✅ Icônes agrandies (+2px) et plus épaisses (strokeWidth 2.5) quand actives
- ✅ Hit area suffisante (44px minimum respecté)
- ✅ Labels toujours visibles

**Tests :**
```bash
# Sur mobile
1. Ouvrir l'app sur iPhone/Android
2. Vérifier que les 5 onglets (Accueil, Factures, Stock, Dettes, Stats) sont visibles
3. Taper chaque onglet 10 fois → doit répondre 10/10 fois
4. Vérifier qu'aucune icône n'est coupée par le home indicator
```

---

### 🔍 Étape 2 : Système Admin/User Simplifié
**Fichiers créés/modifiés :**
- `lib/supabase/useRequireRole.tsx` (nouveau guard)
- `app/admin/_layout.tsx` (utilise le guard)
- `app/admin/index.tsx` (menu admin)
- `app/admin/users.tsx` (gestion utilisateurs)

**Améliorations :**
- ✅ Guard commun `useRequireRole('admin')` pour protéger les routes
- ✅ Menu admin avec accès aux fonctionnalités
- ✅ Gestion des utilisateurs (liste, recherche, stats)
- ✅ Redirection automatique si non autorisé

**Tests :**
```bash
# Compte Admin
1. Se connecter avec un compte admin
2. Aller dans Paramètres → Administration
3. Vérifier l'accès au panneau admin
4. Tester la gestion des utilisateurs

# Compte User
1. Se connecter avec un compte user
2. Vérifier que l'option "Administration" n'apparaît pas
3. Essayer d'accéder à /admin → doit être redirigé
```

---

### 📷 Étape 3 : Scanner Réparé
**Fichiers modifiés :**
- `components/BarcodeScanner.tsx` (fallback web + saisie manuelle)
- `components/ProductExistsModal.tsx` (correction colonnes DB)
- `components/ProductQuickAddModal.tsx` (correction colonnes DB)

**Améliorations :**
- ✅ UN SEUL scanner (icône dans l'onglet Stock)
- ✅ Fallback web : saisie manuelle si caméra indisponible
- ✅ Bouton "Saisie manuelle" TOUJOURS visible
- ✅ Permissions caméra gérées proprement
- ✅ Flux complet : scan → article existant OU création avec code pré-rempli

**Tests :**
```bash
# Mobile (caméra disponible)
1. Ouvrir Stock → cliquer sur l'icône scanner (en haut à droite)
2. Autoriser la caméra
3. Scanner un code-barres
4. Si article existe → modal de détail s'ouvre
5. Si article inexistant → formulaire création avec code pré-rempli

# Web (caméra limitée)
1. Ouvrir Stock → cliquer sur l'icône scanner
2. Si caméra indisponible → champ de saisie manuelle apparaît
3. Bouton "Saisie manuelle" toujours visible même si caméra OK
4. Entrer un code manuellement → fonctionne comme le scan
```

---

### ➕ Étape 4 : Ajout d'Articles Validé
**Fichier modifié :** `app/stock/add.tsx`

**Améliorations :**
- ✅ Validation complète des champs (nom, prix, stock, etc.)
- ✅ Messages d'erreur clairs et spécifiques
- ✅ Gestion des erreurs Supabase (doublon, référence, etc.)
- ✅ Retour automatique à la liste après succès
- ✅ Liste rafraîchie automatiquement

**Tests :**
```bash
1. Ouvrir Stock → cliquer sur "+" (bouton bleu)
2. Essayer de soumettre sans nom → erreur claire
3. Essayer de soumettre sans prix → erreur claire
4. Entrer des données valides → succès + retour à la liste
5. Vérifier que le nouvel article apparaît dans la liste
6. Essayer d'ajouter un article avec code-barres existant → erreur doublon
```

---

### 🌐 Étape 5 : Déploiement Web Configuré
**Fichiers créés/modifiés :**
- `package.json` (script build:web)
- `app.json` (config web complète)
- `vercel.json` (nouveau)
- `netlify.toml` (nouveau)
- `.gitignore` (mis à jour)

**Configuration :**
- ✅ Build web : `npm run build:web` → dossier `dist/`
- ✅ Rewrites pour expo-router (SPA)
- ✅ Favicon + meta title + description
- ✅ Prêt pour Vercel ou Netlify

**Tests :**
```bash
# Build local
npm run build:web
# Vérifier que le dossier dist/ est créé avec index.html

# Tester localement (optionnel)
npx serve dist
# Ouvrir http://localhost:3000
```

---

### 🧪 BONUS : Page Test Rapide
**Fichier créé :** `app/test.tsx`

**Fonctionnalités :**
- ✅ Tests smoke pour toutes les routes principales
- ✅ Tests des fonctionnalités (scanner, ajout article, nouvelle facture)
- ✅ Compteur de tests réussis
- ✅ Accessible via Paramètres (en mode DEV uniquement)

**Tests :**
```bash
1. Ouvrir Paramètres (onglet avec icône engrenage)
2. En bas, cliquer sur "🧪 Tests Rapides (Dev)" (visible uniquement en dev)
3. Tester chaque fonctionnalité en cliquant sur les boutons
4. Vérifier que tout fonctionne
```

---

## 🚀 Déploiement

### Option 1 : Vercel (Recommandé)
```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Se connecter
vercel login

# 3. Déployer
vercel

# 4. Pour production
vercel --prod
```

### Option 2 : Netlify
```bash
# 1. Installer Netlify CLI
npm i -g netlify-cli

# 2. Se connecter
netlify login

# 3. Déployer
netlify deploy

# 4. Pour production
netlify deploy --prod
```

### Option 3 : GitHub (Auto-deploy)
1. Push le code sur GitHub
2. Connecter le repo à Vercel ou Netlify
3. Le build se lance automatiquement à chaque push

---

## 📱 Checklist Tests Complets

### Bottom Tabs ✅
- [ ] Sur iPhone : tous les onglets visibles et cliquables
- [ ] Sur Android : idem
- [ ] Sur Web mobile : idem
- [ ] Aucune icône coupée par le home indicator
- [ ] Hit area suffisante (test des 10 taps sur chaque onglet)

### Scanner ✅
- [ ] Un seul bouton scanner (dans Stock)
- [ ] Sur mobile : scan fonctionne avec caméra
- [ ] Sur web : fallback saisie manuelle fonctionne
- [ ] Bouton "Saisie manuelle" toujours visible
- [ ] Article existant → modal détail
- [ ] Article inexistant → formulaire création avec code pré-rempli

### Articles ✅
- [ ] Ajout article : validation fonctionne
- [ ] Messages d'erreur clairs
- [ ] Après ajout : retour à la liste
- [ ] Liste rafraîchie automatiquement

### Admin ✅
- [ ] Compte admin : accès au panneau admin
- [ ] Compte user : pas d'accès admin
- [ ] Guard fonctionne (redirection si non autorisé)

### Web ✅
- [ ] Build web fonctionne : `npm run build:web`
- [ ] Navigation fonctionne (pas d'écran blanc au refresh)
- [ ] Favicon visible
- [ ] Meta title correct

---

## 🐛 Troubleshooting

### Les tabs ne sont pas visibles
→ Vérifier que `SafeAreaView` est utilisé dans les écrans
→ Vérifier que `useSafeAreaInsets()` retourne bien des valeurs

### Scanner ne fonctionne pas sur web
→ HTTPS requis pour accéder à la caméra
→ Utiliser le fallback de saisie manuelle

### Articles ne s'affichent pas après ajout
→ Vérifier que `useFocusEffect` est bien présent dans `stock.tsx`
→ Vérifier la connexion Supabase

### Build web échoue
→ Vérifier que toutes les dépendances sont installées : `npm install`
→ Vérifier les variables d'environnement (`.env`)

---

## 📞 Support

En cas de problème, vérifier :
1. Les logs de la console
2. Les permissions (caméra, réseau)
3. La connexion Supabase
4. Les variables d'environnement

Bon déploiement ! 🎉
