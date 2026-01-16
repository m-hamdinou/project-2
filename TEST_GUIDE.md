# Guide de Test - Système d'Activation

## Prérequis

1. **Configuration de la clé admin** (IMPORTANT)
   - Connectez-vous à votre dashboard Supabase
   - Allez dans Settings > Edge Functions > Environment Variables
   - Ajoutez : `ADMIN_KEY` avec une valeur sécurisée (ex: `Admin2024SecureKey!`)
   - Notez cette clé, vous en aurez besoin pour générer des codes

2. **Configuration du support**
   - Ouvrez `app/auth/activation.tsx`
   - Ligne 94 : Remplacez `+212XXXXXXXXX` par votre numéro WhatsApp
   - Ligne 103 : Remplacez `support@example.com` par votre email de support

## Test 1 : Génération de codes (Admin)

### Étape 1 : Accéder à l'interface admin
1. Lancez l'application
2. Connectez-vous avec un compte existant (ou créez-en un)
3. Allez dans **Paramètres** (via les tabs)
4. Cliquez sur **Administration**
5. Vous arrivez sur `/admin/codes`

### Étape 2 : Générer des codes
1. Entrez votre clé admin (configurée dans les prérequis)
2. Nombre de codes : `5`
3. Durée de validité : `30` jours
4. Cliquez sur **Générer les codes**

**Résultat attendu** :
- Message de succès
- Liste de 5 codes affichés (format : XXXXXXXX)
- Date d'expiration indiquée

### Étape 3 : Sauvegarder les codes
1. Cliquez sur "Voir tous" pour afficher tous les codes
2. Copiez-les (notez-les quelque part)
3. Ces codes ne seront plus visibles après avoir quitté la page

**⚠️ Codes générés à sauvegarder** : ___________________

## Test 2 : Création de compte et activation

### Étape 1 : Créer un nouveau compte
1. Déconnectez-vous de l'application
2. Sur l'écran d'accueil, cliquez sur **Créer un compte**
3. Remplissez :
   - Téléphone : `+222 XX XX XX XX`
   - Mot de passe : `test123`
   - Nom boutique : `Test Shop`
4. Créez le compte

**Résultat attendu** :
- Compte créé
- ⚠️ Redirection automatique vers l'écran d'activation
- Message : "Votre compte est en attente d'activation"

### Étape 2 : Vérifier le blocage de navigation
1. Essayez de revenir en arrière
2. Essayez d'accéder aux fonctionnalités

**Résultat attendu** :
- Impossible d'accéder à l'application
- Seul l'écran d'activation est accessible
- Boutons disponibles : Activer, Contacter le support, Se déconnecter

### Étape 3 : Tester un code invalide
1. Entrez un code au hasard : `ABCD1234`
2. Cliquez sur **Activer**

**Résultat attendu** :
- Message d'erreur : "Code d'activation invalide"

### Étape 4 : Activer avec un code valide
1. Entrez un des codes générés précédemment
2. Cliquez sur **Activer**

**Résultat attendu** :
- Message de succès : "Votre compte a été activé avec succès !"
- ✅ Redirection automatique vers l'application
- Accès complet à toutes les fonctionnalités

## Test 3 : Vérifier le statut activé

1. Allez dans **Paramètres**
2. En haut de la page, vérifiez le badge de statut

**Résultat attendu** :
- Badge vert avec "Compte activé"
- Icône de bouclier vert

## Test 4 : Reconnexion avec compte activé

1. Déconnectez-vous
2. Reconnectez-vous avec le même compte

**Résultat attendu** :
- Connexion réussie
- ✅ Accès direct à l'application (pas d'écran d'activation)
- Le statut reste "active"

## Test 5 : Code déjà utilisé

1. Créez un nouveau compte (autre téléphone)
2. Essayez d'utiliser le même code que précédemment

**Résultat attendu** :
- Message d'erreur : "Ce code a déjà été utilisé"
- Compte reste en status "pending"

## Test 6 : Contact support

1. Créez un nouveau compte
2. Sur l'écran d'activation, cliquez sur **Contacter le support**
3. Testez les options WhatsApp et Email

**Résultat attendu** :
- Choix entre WhatsApp et Email
- WhatsApp s'ouvre avec un message pré-rempli
- Email s'ouvre avec sujet et corps pré-remplis

## Test 7 : Vérification base de données

### Via Supabase Dashboard

1. Allez dans votre projet Supabase
2. Ouvrez **Table Editor**
3. Table `users` :
   ```sql
   SELECT id, phone, status, activated_at
   FROM users
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   **Vérifiez** :
   - Le compte activé a `status = 'active'`
   - `activated_at` est rempli

4. Table `activation_codes` :
   ```sql
   SELECT code, used, used_by, expires_at
   FROM activation_codes
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   **Vérifiez** :
   - Les codes utilisés ont `used = true`
   - `used_by` contient l'ID de l'utilisateur
   - `used_at` est rempli

## Test 8 : Sécurité RLS

### Depuis l'application (compte normal)

1. Ouvrez la console du navigateur (en mode web)
2. Essayez de lire les codes :
   ```javascript
   const { data } = await supabase
     .from('activation_codes')
     .select('*');
   console.log(data);
   ```

**Résultat attendu** :
- `data` est vide ou erreur
- Les utilisateurs ne peuvent PAS lire les codes

## Test 9 : Code expiré

### Préparation (via SQL)

1. Dans Supabase SQL Editor :
   ```sql
   -- Créer un code expiré
   INSERT INTO activation_codes (code, expires_at)
   VALUES ('EXPIRED1', now() - interval '1 day');
   ```

2. Créez un nouveau compte
3. Essayez d'utiliser le code `EXPIRED1`

**Résultat attendu** :
- Message d'erreur : "Ce code a expiré"

## Test 10 : Compte bloqué

### Préparation (via SQL)

1. Bloquez un compte :
   ```sql
   UPDATE users
   SET status = 'blocked'
   WHERE phone = '+222XXXXXXXX'; -- Remplacez par un numéro de test
   ```

2. Déconnectez-vous
3. Connectez-vous avec ce compte

**Résultat attendu** :
- Message : "Votre compte est bloqué"
- Pas d'accès à l'application

## Checklist finale

- [ ] Génération de codes fonctionne
- [ ] Nouveaux comptes sont en status "pending"
- [ ] Écran d'activation bloque l'accès
- [ ] Code invalide → erreur
- [ ] Code valide → activation réussie
- [ ] Code déjà utilisé → erreur
- [ ] Code expiré → erreur
- [ ] Compte activé reste activé après reconnexion
- [ ] RLS empêche la lecture des codes
- [ ] Badge de statut affiché dans les paramètres
- [ ] Contact support fonctionne

## Problèmes fréquents et solutions

### "Failed to generate codes"
- Vérifiez que `ADMIN_KEY` est correctement configurée
- Vérifiez que la clé entrée correspond exactement

### "Cannot activate account"
- Vérifiez que l'edge function `activate-account` est déployée
- Vérifiez les logs dans Supabase > Edge Functions > Logs

### Utilisateur reste bloqué sur l'écran d'activation
- Vérifiez le statut dans la base : `SELECT status FROM users WHERE phone = '...'`
- Si besoin, activez manuellement :
  ```sql
  UPDATE users
  SET status = 'active', activated_at = now()
  WHERE phone = '+222XXXXXXXX';
  ```

### Edge function ne répond pas
- Vérifiez que les fonctions sont bien déployées
- Vérifiez les variables d'environnement (SUPABASE_URL, etc.)
- Consultez les logs dans Supabase Dashboard

## Notes importantes

1. **Codes sensibles** : Sauvegardez toujours les codes générés
2. **Clé admin** : Gardez-la confidentielle
3. **Production** : Changez `ADMIN_KEY` avant le déploiement
4. **Support** : Configurez les vraies coordonnées de support

## Résultats des tests

Date : _______________
Testeur : _______________

| Test | Statut | Notes |
|------|--------|-------|
| 1. Génération codes | ⬜ | |
| 2. Création + activation | ⬜ | |
| 3. Statut affiché | ⬜ | |
| 4. Reconnexion | ⬜ | |
| 5. Code réutilisé | ⬜ | |
| 6. Contact support | ⬜ | |
| 7. Base de données | ⬜ | |
| 8. Sécurité RLS | ⬜ | |
| 9. Code expiré | ⬜ | |
| 10. Compte bloqué | ⬜ | |

**Signature** : _______________
