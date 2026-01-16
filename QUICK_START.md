# Démarrage Rapide - Système d'Activation

## 🚀 Configuration en 5 minutes

### 1. Configuration Supabase (2 min)

1. Connectez-vous à votre [Dashboard Supabase](https://supabase.com/dashboard)
2. Allez dans **Settings > Edge Functions > Environment Variables**
3. Ajoutez cette variable :
   ```
   Nom : ADMIN_KEY
   Valeur : VotreCleSuperSecrete123!
   ```
4. Cliquez sur **Save**

**⚠️ Important** : Notez bien cette clé, vous en aurez besoin pour générer des codes.

### 2. Configuration Support (1 min)

Ouvrez le fichier : `app/auth/activation.tsx`

Modifiez ces lignes :
```typescript
// Ligne 94 - Votre numéro WhatsApp
const phone = '+212XXXXXXXXX'; // Remplacez par votre numéro

// Ligne 103 - Votre email de support
const email = 'support@example.com'; // Remplacez par votre email
```

### 3. Premier test (2 min)

#### Générer vos premiers codes

1. Lancez l'application : `npm run dev`
2. Connectez-vous ou créez un compte
3. Allez dans **Paramètres** → **Administration**
4. Entrez :
   - Clé admin : (celle que vous avez configurée)
   - Nombre : `10`
   - Durée : `30` jours
5. Cliquez sur **Générer les codes**
6. **IMPORTANT** : Copiez et sauvegardez ces codes !

#### Tester l'activation

1. Déconnectez-vous
2. Créez un nouveau compte (autre téléphone)
3. Vous verrez l'écran d'activation
4. Entrez un des codes générés
5. Cliquez sur **Activer**
6. ✅ Votre compte est activé !

## 📋 Ce que vous devez savoir

### Comment ça marche ?

1. **Nouvel utilisateur** → Status = `pending`
2. **Écran d'activation** → Bloque l'accès à l'app
3. **Code valide** → Status = `active` → Accès complet
4. **Code invalide/expiré/utilisé** → Message d'erreur

### Format des codes

- 8 caractères alphanumériques
- Exemple : `A3K7PM4R`
- Pas de caractères confusants (0/O, 1/I)
- Un code = un seul usage

### Accès admin

L'interface de génération de codes est accessible via :
- **Paramètres** → **Administration**
- Ou directement : `/admin/codes`

### Statut du compte

Trois statuts possibles :
- 🟡 **pending** : En attente d'activation
- 🟢 **active** : Activé et accès complet
- 🔴 **blocked** : Bloqué, pas d'accès

Le statut s'affiche dans **Paramètres** (badge en haut).

## 🔧 Commandes utiles

### Vérifier les comptes en attente

```sql
SELECT phone, shop_name, created_at
FROM users
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Activer manuellement un compte (urgence)

```sql
UPDATE users
SET status = 'active', activated_at = now()
WHERE phone = '+222XXXXXXXX';
```

### Vérifier les codes disponibles

```sql
SELECT
  count(*) FILTER (WHERE NOT used AND expires_at > now()) as disponibles,
  count(*) FILTER (WHERE used) as utilises,
  count(*) FILTER (WHERE NOT used AND expires_at <= now()) as expires
FROM activation_codes;
```

## 📱 Flow utilisateur

```
Inscription
    ↓
Status = pending
    ↓
Écran d'activation
    ↓
Entrée du code
    ↓
┌─────────────────┐
│ Code valide ?   │
├─────────────────┤
│ ✅ Oui          │ → Status = active → Accès à l'app
│ ❌ Non          │ → Message d'erreur → Réessayer ou support
└─────────────────┘
```

## ⚠️ Points importants

### Sécurité

✅ **BON** :
- Codes générés cryptographiquement
- RLS empêche la lecture des codes
- Un code = un seul usage
- Clé admin sécurisée

❌ **À ÉVITER** :
- Partager la clé admin
- Publier des codes en public
- Réutiliser des codes

### Distribution des codes

Méthodes recommandées :
- Email personnel après paiement
- WhatsApp direct
- Message sécurisé
- Fichier Excel pour équipe

**Ne PAS** :
- Poster sur réseaux sociaux
- Envoyer en masse non sécurisé
- Laisser accessibles publiquement

## 🆘 Besoin d'aide ?

### L'utilisateur dit "Je n'ai pas reçu de code"

1. Vérifiez qu'il a bien créé un compte
2. Générez un nouveau code
3. Envoyez-le via WhatsApp ou Email
4. Guidez-le sur l'écran d'activation

### "Mon code ne marche pas"

Vérifications :
1. Le code est-il correct ? (case insensitive)
2. Est-il expiré ? Vérifiez la date
3. A-t-il déjà été utilisé ?
4. Le compte existe-t-il ?

Solutions :
- Générer un nouveau code
- Vérifier en base de données
- Activation manuelle si urgence

### "Je reste bloqué sur l'écran d'activation"

1. Vérifiez le statut en base
2. Vérifiez les logs des edge functions
3. Essayez avec un autre code
4. Activation manuelle en dernier recours

## 📚 Documentation complète

Pour plus de détails :
- **ACTIVATION_SYSTEM.md** : Documentation technique complète
- **TEST_GUIDE.md** : Guide de test détaillé avec 10 scénarios

## ✅ Checklist de déploiement

Avant de mettre en production :

- [ ] Clé admin changée (pas de valeur par défaut)
- [ ] Numéro WhatsApp configuré
- [ ] Email de support configuré
- [ ] Test complet effectué (voir TEST_GUIDE.md)
- [ ] 30+ codes générés et sauvegardés
- [ ] Équipe formée sur la génération de codes
- [ ] Process de support en place

## 🎉 C'est prêt !

Votre système d'activation est maintenant opérationnel. Les nouveaux utilisateurs devront entrer un code pour accéder à l'application.

**Prochaine étape** : Générez des codes et commencez à les distribuer !
