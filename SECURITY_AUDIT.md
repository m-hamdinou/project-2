# 🔒 AUDIT DE SÉCURITÉ - FATORA

**Date:** 16 Janvier 2026
**Statut:** ⚠️ CRITIQUE - Action immédiate requise

---

## 🚨 PROBLÈMES CRITIQUES IDENTIFIÉS

### 1. ⛔ SYSTÈME D'AUTHENTIFICATION NON SÉCURISÉ

**Sévérité:** 🔴 CRITIQUE

#### Problèmes:

1. **Authentification custom sans Supabase Auth**
   - Localisation: `lib/supabase/AuthContext.tsx`
   - L'application utilise un système d'authentification entièrement custom
   - N'utilise PAS Supabase Auth (supabase.auth.signUp/signIn)
   - Stockage manuel des sessions dans AsyncStorage

2. **Hashage de mot de passe extrêmement faible**
   - Localisation: `lib/supabase/AuthContext.tsx:45-53`
   ```typescript
   function hashPassword(password: string): string {
     let hash = 0;
     for (let i = 0; i < password.length; i++) {
       const char = password.charCodeAt(i);
       hash = ((hash << 5) - hash) + char;
       hash = hash & hash;
     }
     return hash.toString(16) + '_' + password.length + '_' + btoa(password).slice(0, 10);
   }
   ```
   - ⚠️ Ce n'est PAS un algorithme de hashage cryptographique
   - Les mots de passe peuvent être facilement inversés (btoa est réversible)
   - Aucun salt, aucune protection contre les attaques par dictionnaire

3. **Pas de session Supabase authentifiée**
   - Les requêtes à Supabase ne sont PAS authentifiées
   - `auth.uid()` retourne toujours NULL
   - Les RLS policies NE FONCTIONNENT PAS

#### Impact:
- ❌ **AUCUNE protection réelle des données**
- ❌ **Tous les utilisateurs peuvent théoriquement accéder aux données de tous**
- ❌ **Les mots de passe ne sont pas sécurisés**
- ❌ **Vulnérable aux attaques**

---

### 2. ⛔ RLS POLICIES NON FONCTIONNELLES

**Sévérité:** 🔴 CRITIQUE

#### Problèmes:

1. **Policies basées sur auth.uid() qui est NULL**
   - Toutes les policies vérifient `auth.uid()` ou `auth.jwt()`
   - Mais sans session Supabase Auth, ces fonctions retournent NULL
   - Résultat: Les policies rejettent TOUTES les requêtes

2. **Incohérence tables users vs profiles**
   - Table `users` : utilisée par l'app, contient les données, référence dans foreign keys
   - Table `profiles` : liée à auth.users, jamais utilisée
   - Les policies de `profiles` vérifient `auth.uid() = id`
   - Mais `profiles.id` devrait référencer auth.users qui n'a pas d'entrées

3. **Policies admin non fonctionnelles**
   - Vérifient `auth.jwt() ->> 'role' = 'admin'`
   - Mais le JWT Supabase Auth n'existe pas
   - Le rôle est dans la table `users` custom

#### Impact:
- ❌ **Aucune requête ne devrait fonctionner avec RLS**
- ⚠️ Soit RLS est désactivé (dangereux), soit l'app ne fonctionne pas
- ❌ **Séparation des données utilisateurs non garantie**

---

### 3. 🟡 ADMIN_KEY PAR DÉFAUT NON SÉCURISÉE

**Sévérité:** 🟡 MOYENNE

#### Problèmes:

- Localisation: `supabase/functions/generate-codes/index.ts:42`
- Valeur par défaut: `123456`
- Documentation mentionne `CHANGE_ME_IN_PRODUCTION` mais code dit `123456`

```typescript
const expectedAdminKey = Deno.env.get('ADMIN_KEY') || '123456';
```

#### Impact:
- 🟡 Si variable d'environnement non définie, n'importe qui peut générer des codes
- 🟡 Documentation incohérente

---

### 4. 🟢 CLÉS EXPOSÉES (ACCEPTABLE)

**Sévérité:** 🟢 BASSE

#### Constatation:

- `.env` contient la clé ANON de Supabase
- ✅ C'est normal et acceptable pour une clé publique
- ✅ La clé SERVICE_ROLE n'est PAS exposée côté client
- ✅ Utilisée uniquement dans les Edge Functions

---

## 📋 TABLES ET RLS - ÉTAT ACTUEL

### Tables avec RLS Activé ✅

| Table | RLS Activé | Policies | Fonctionnelles? |
|-------|------------|----------|-----------------|
| `users` | ✅ | 2 policies | ❌ (auth.uid() = NULL) |
| `profiles` | ✅ | 4 policies | ❌ (table non utilisée) |
| `products` | ✅ | 4 policies | ❌ (auth.uid() = NULL) |
| `services` | ✅ | 4 policies | ❌ (auth.uid() = NULL) |
| `clients` | ✅ | 4 policies | ❌ (auth.uid() = NULL) |
| `invoices` | ✅ | 4 policies | ❌ (auth.uid() = NULL) |
| `invoice_items` | ✅ | 4 policies | ❌ (via invoices) |
| `payments` | ✅ | 4 policies | ❌ (auth.uid() = NULL) |
| `activation_codes` | ✅ | 4 policies | ❌ (JWT role inexistant) |

### Résumé:
- ✅ **RLS activé partout** (bon point)
- ❌ **Aucune policy ne fonctionne** (système d'auth incompatible)

---

## 🔍 AUTRES VULNÉRABILITÉS

### Stockage des mots de passe

- ❌ Hachage non cryptographique
- ❌ Pas de salt
- ❌ Algorithme réversible (btoa)
- ❌ Stocké dans table custom sans protection Supabase Auth

### Gestion des sessions

- ⚠️ Sessions stockées en clair dans AsyncStorage
- ⚠️ Pas de rotation de token
- ⚠️ Pas d'expiration automatique sécurisée
- ⚠️ Validation côté client uniquement

### API Edge Functions

- ✅ CORS correctement configuré
- ✅ Validation des inputs
- ✅ Utilisation de SERVICE_ROLE pour accès privilégié
- 🟡 ADMIN_KEY faible par défaut

---

## 🎯 PLAN D'ACTION PRIORITAIRE

### Phase 1: CRITIQUE - Refondre l'authentification ⚡

**Objectif:** Migrer vers Supabase Auth natif

1. **Migrer de auth custom vers Supabase Auth**
   - Remplacer le système custom par `supabase.auth.signUp()`
   - Utiliser email ou phone avec Supabase Auth
   - Supprimer le hashage custom faible

2. **Synchroniser les données utilisateurs**
   - Créer/Nettoyer la table `profiles` liée à `auth.users`
   - Migrer les données de `users` vers `profiles`
   - Mettre à jour toutes les foreign keys

3. **Corriger AuthContext**
   - Utiliser `supabase.auth.onAuthStateChange()`
   - Gérer les sessions Supabase natives
   - Supprimer le hashage custom

### Phase 2: CRITIQUE - Corriger les RLS Policies 🔒

1. **Refactoriser toutes les policies**
   - Remplacer références à `users` par `profiles` ou auth.users
   - S'assurer que `auth.uid()` fonctionne
   - Tester chaque policy

2. **Implémenter le rôle admin correctement**
   - Stocker le rôle dans `auth.users.raw_app_metadata`
   - Utiliser `auth.jwt() ->> 'app_metadata' ->> 'role'`
   - Créer une fonction helper pour vérifier les rôles

3. **Ajouter des policies manquantes**
   - Policies INSERT/DELETE pour users si nécessaire
   - Validation des permissions cross-table

### Phase 3: HAUTE - Sécuriser le système d'activation 🎫

1. **Refondre activate-account edge function**
   - Vérifier l'utilisateur via auth.uid()
   - Empêcher l'activation multiple
   - Logger les tentatives

2. **Améliorer generate-codes**
   - Forcer ADMIN_KEY obligatoire en production
   - Ajouter rate limiting
   - Logger les générations

3. **UI Admin sécurisée**
   - Vérification du rôle admin côté serveur
   - Actions auditées
   - Interface de gestion des codes

### Phase 4: MOYENNE - Hardening général 🛡️

1. **Anti-spam / rate limiting**
   - Limiter les tentatives de login
   - Limiter les créations de compte
   - Protéger contre le brute force

2. **Audit logging**
   - Logger les connexions
   - Logger les actions admin
   - Logger les activations

3. **Documentation sécurité**
   - Procédures de déploiement sécurisé
   - Checklist de configuration production
   - Guide de gestion des incidents

---

## ✅ CHECKLIST DE VALIDATION POST-CORRECTIFS

### Authentification
- [ ] Utilise Supabase Auth natif
- [ ] Mots de passe hashés avec bcrypt/scrypt par Supabase
- [ ] Sessions Supabase valides
- [ ] `auth.uid()` retourne l'ID correct
- [ ] Pas de hashage custom côté client

### RLS
- [ ] Toutes les tables ont RLS activé
- [ ] Policies testées et fonctionnelles
- [ ] Utilisateur ne peut voir que ses données
- [ ] Admin peut voir toutes les données
- [ ] Utilisateurs non connectés ne peuvent rien voir

### Activation
- [ ] ADMIN_KEY forte et configurée
- [ ] Codes générés de manière sécurisée
- [ ] Codes à usage unique
- [ ] Expiration des codes respectée
- [ ] Logging des activations

### Secrets
- [ ] Aucune clé secrète côté client
- [ ] SERVICE_ROLE uniquement dans Edge Functions
- [ ] ADMIN_KEY en variable d'environnement
- [ ] Documentation à jour

---

## 📊 NIVEAU DE RISQUE GLOBAL

**Avant correctifs:** 🔴 **CRITIQUE**

- Authentification cassée
- Mots de passe non sécurisés
- RLS non fonctionnel
- Données potentiellement accessibles par tous

**Après correctifs:** 🟢 **ACCEPTABLE**

- Authentification Supabase standard
- RLS fonctionnel et testé
- Séparation des données garantie
- Système d'activation sécurisé

---

## 🔗 RÉFÉRENCES

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)

---

**Prochaine étape:** Commencer la Phase 1 - Refonte de l'authentification
