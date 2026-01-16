# Système d'Activation par Code - Documentation

## Vue d'ensemble

Le système d'activation par code permet de contrôler l'accès à l'application Fatora. Tous les nouveaux utilisateurs commencent avec un statut "pending" et doivent entrer un code d'activation valide pour accéder aux fonctionnalités de l'application.

## Architecture

### Base de données

#### Table `users`
- Nouveau champ `status`: 'pending' | 'active' | 'blocked'
- Nouveau champ `activated_at`: Date d'activation
- Par défaut, tous les nouveaux comptes ont status = 'pending'

#### Table `activation_codes`
- `id`: UUID unique
- `code`: Code d'activation (8 caractères alphanumériques)
- `used`: Boolean indiquant si le code a été utilisé
- `expires_at`: Date d'expiration
- `used_by`: Référence à l'utilisateur qui a utilisé le code
- `used_at`: Date d'utilisation
- `created_at`: Date de création

### Edge Functions

#### 1. `activate-account`
**Endpoint**: `/functions/v1/activate-account`
**Méthode**: POST
**Authentification**: Non requise

**Body**:
```json
{
  "userId": "uuid-de-l-utilisateur",
  "code": "CODE8CAR"
}
```

**Réponse succès**:
```json
{
  "success": true,
  "message": "Compte activé avec succès !"
}
```

**Erreurs possibles**:
- Code invalide
- Code déjà utilisé
- Code expiré
- Compte déjà activé
- Compte bloqué

#### 2. `generate-codes`
**Endpoint**: `/functions/v1/generate-codes`
**Méthode**: POST
**Authentification**: Clé admin requise

**Body**:
```json
{
  "count": 30,
  "expirationDays": 30,
  "adminKey": "VOTRE_CLE_ADMIN"
}
```

**Réponse succès**:
```json
{
  "success": true,
  "count": 30,
  "codes": ["CODE1", "CODE2", ...],
  "expiresAt": "2026-02-11T..."
}
```

## Flow Utilisateur

### 1. Inscription
1. L'utilisateur crée un compte (téléphone + mot de passe)
2. Le compte est créé avec `status = 'pending'`
3. L'utilisateur est automatiquement redirigé vers l'écran d'activation

### 2. Activation
1. L'écran d'activation demande un code
2. L'utilisateur entre le code reçu de l'administrateur
3. Le code est validé via l'edge function `activate-account`
4. Si valide:
   - Le code est marqué comme utilisé
   - Le statut du compte passe à 'active'
   - L'utilisateur accède immédiatement à l'application
5. Si invalide:
   - Un message d'erreur est affiché
   - L'utilisateur peut réessayer ou contacter le support

### 3. Connexion
1. L'utilisateur se connecte avec ses identifiants
2. Le système vérifie son statut:
   - Si `pending`: Redirection vers l'écran d'activation
   - Si `active`: Accès à l'application
   - Si `blocked`: Accès refusé

## Configuration Admin

### 1. Configuration de la clé admin

La clé admin est stockée dans les variables d'environnement Supabase:
- Variable: `ADMIN_KEY`
- Valeur par défaut: `CHANGE_ME_IN_PRODUCTION`

**⚠️ IMPORTANT**: Changez cette clé en production!

### 2. Génération de codes

#### Via l'interface admin (Recommandé)

1. Accédez à `/admin/codes` dans l'application
2. Entrez votre clé admin
3. Définissez:
   - Nombre de codes (1-1000)
   - Durée de validité (en jours)
4. Cliquez sur "Générer les codes"
5. Sauvegardez les codes générés (ils ne seront plus affichés)

#### Via API directe

```bash
curl -X POST https://VOTRE_PROJET.supabase.co/functions/v1/generate-codes \
  -H "Content-Type: application/json" \
  -d '{
    "count": 30,
    "expirationDays": 30,
    "adminKey": "VOTRE_CLE_ADMIN"
  }'
```

### 3. Distribution des codes

Une fois les codes générés:
1. Copiez la liste des codes
2. Distribuez-les aux utilisateurs autorisés
3. Chaque code ne peut être utilisé qu'une seule fois
4. Les codes expirent après la durée définie

## Sécurité

### Protection RLS (Row Level Security)

Les codes d'activation sont protégés:
- Les utilisateurs normaux ne peuvent PAS lire les codes
- Seules les edge functions (service role) peuvent accéder aux codes
- Impossible de deviner ou bruteforcer les codes

### Format des codes

- 8 caractères alphanumériques
- Exclut les caractères confusants (0/O, 1/I/l)
- Génération cryptographiquement sécurisée
- Exemple: `A3K7PM4R`

### Blocage des accès

Les données métier sont inaccessibles aux comptes non-activés:
- L'application vérifie le statut à chaque connexion
- La navigation est bloquée pour les comptes pending
- Les RLS policies sont en place côté serveur

## Cas d'usage

### 1. Activation après paiement
1. Client paie pour l'accès
2. Admin génère un code
3. Admin envoie le code au client
4. Client active son compte

### 2. Période d'essai
1. Générer des codes avec expiration courte (7 jours)
2. Distribuer aux testeurs
3. Les codes expirent automatiquement

### 3. Contrôle des inscriptions
1. Ne pas publier de codes publiquement
2. Chaque inscription nécessite validation
3. Évite le spam et les abus

## Tests

### Test d'activation réussie

```javascript
// 1. Créer un compte
// 2. Générer un code valide
// 3. Utiliser le code
// Résultat attendu: Compte activé, accès complet

const response = await fetch(
  'https://VOTRE_PROJET.supabase.co/functions/v1/activate-account',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'uuid-test',
      code: 'CODE_VALIDE'
    })
  }
);
// Devrait retourner 200 avec success: true
```

### Test de code invalide

```javascript
// Utiliser un code inexistant
// Résultat attendu: Erreur "Code d'activation invalide"
```

### Test de code déjà utilisé

```javascript
// Utiliser le même code deux fois
// Résultat attendu: Erreur "Ce code a déjà été utilisé"
```

### Test de code expiré

```javascript
// Utiliser un code dont expires_at est passé
// Résultat attendu: Erreur "Ce code a expiré"
```

## Maintenance

### Vérifier les codes actifs

```sql
SELECT
  count(*) as total,
  sum(case when used then 1 else 0 end) as used,
  sum(case when not used and expires_at > now() then 1 else 0 end) as available,
  sum(case when not used and expires_at <= now() then 1 else 0 end) as expired
FROM activation_codes;
```

### Lister les comptes en attente

```sql
SELECT id, phone, shop_name, created_at
FROM users
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Activer manuellement un compte (urgence)

```sql
UPDATE users
SET status = 'active', activated_at = now()
WHERE id = 'uuid-utilisateur';
```

### Nettoyer les codes expirés (optionnel)

```sql
DELETE FROM activation_codes
WHERE used = false
AND expires_at < now() - interval '30 days';
```

## Support

### Écran d'activation

L'écran d'activation inclut:
- Bouton "Contacter le support"
- Options WhatsApp et Email
- Numéro de support à configurer

**À configurer dans** `app/auth/activation.tsx`:
```typescript
const phone = '+212XXXXXXXXX'; // Remplacer par votre numéro
const email = 'support@example.com'; // Remplacer par votre email
```

## FAQ

**Q: Que se passe-t-il si un utilisateur perd son code?**
R: L'admin peut générer un nouveau code ou activer manuellement le compte.

**Q: Peut-on réutiliser un code?**
R: Non, chaque code ne fonctionne qu'une seule fois.

**Q: Comment bloquer un utilisateur?**
R: Mettre `status = 'blocked'` dans la table users.

**Q: Les codes sont-ils sensibles à la casse?**
R: Non, ils sont automatiquement convertis en majuscules.

**Q: Combien de codes peut-on générer d'un coup?**
R: Maximum 1000 codes par génération.

**Q: Peut-on changer la durée de validité après génération?**
R: Non, mais vous pouvez modifier `expires_at` manuellement en SQL.

## Checklist de déploiement

- [ ] Changer `ADMIN_KEY` en production
- [ ] Configurer les informations de support (téléphone/email)
- [ ] Générer un premier lot de codes de test
- [ ] Tester l'activation complète end-to-end
- [ ] Former l'équipe admin sur la génération de codes
- [ ] Préparer un process de support pour les problèmes d'activation

## Conformité App Stores

Le système respecte les guidelines:
- ✅ L'app affiche du contenu même sans activation
- ✅ Écran d'activation avec instructions claires
- ✅ Option de contact support
- ✅ Pas de mention explicite de paiement obligatoire
- ✅ Message neutre: "activation par l'administrateur"
