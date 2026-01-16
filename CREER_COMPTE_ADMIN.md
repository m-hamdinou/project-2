# 🔐 Guide : Créer un Compte Administrateur

Ce guide explique comment créer un compte administrateur pour l'application Fatora.

## 📋 Prérequis

- Accès à votre base de données Supabase
- Le mot de passe que vous souhaitez utiliser pour l'admin

---

## 🔧 Étape 1 : Préparer le Mot de Passe Hashé

L'application utilise un système de hash personnalisé pour les mots de passe. Vous devez d'abord créer le hash de votre mot de passe.

### Option A : Utiliser la console navigateur (Recommandé)

1. Ouvrez votre navigateur web
2. Appuyez sur `F12` pour ouvrir les outils de développeur
3. Allez dans l'onglet **Console**
4. Copiez et collez ce code (remplacez `VOTRE_MOT_DE_PASSE` par votre mot de passe) :

```javascript
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16) + '_' + password.length + '_' + btoa(password).slice(0, 10);
}

const password = 'VOTRE_MOT_DE_PASSE';
const hashed = hashPassword(password);
console.log('Hash du mot de passe:', hashed);
```

5. Copiez le hash généré (par exemple : `-1a2b3c4d_8_QWRtaW4x`)

### Option B : Créer un utilisateur normal puis modifier

1. Créez un compte utilisateur normal dans l'application
2. Utilisez le mot de passe souhaité pour l'admin
3. Notez le `password_hash` créé dans la table `users`
4. Utilisez ce hash à l'étape suivante

---

## 🗄️ Étape 2 : Créer le Compte Admin dans la Base de Données

### Option 1 : Via l'Éditeur SQL Supabase (Recommandé)

1. Connectez-vous à votre **dashboard Supabase**
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête et exécutez :

```sql
-- Remplacez les valeurs ci-dessous
SELECT create_admin_user(
  '22123456'::text,                              -- Numéro de téléphone
  '-1a2b3c4d_8_QWRtaW4x'::text,                 -- Hash du mot de passe (de l'étape 1)
  'Administration Fatora'::text                  -- Nom du magasin (optionnel)
);
```

### Option 2 : Insertion Directe

Si vous préférez insérer directement :

```sql
INSERT INTO users (
  phone,
  password_hash,
  shop_name,
  role,
  status,
  activated_at,
  created_at,
  updated_at
) VALUES (
  '22123456',                    -- Votre numéro de téléphone
  '-1a2b3c4d_8_QWRtaW4x',       -- Hash du mot de passe
  'Administration Fatora',       -- Nom du magasin
  'admin',                       -- Rôle admin
  'active',                      -- Statut actif (pas besoin d'activation)
  NOW(),                         -- Activé maintenant
  NOW(),
  NOW()
);
```

---

## ✅ Étape 3 : Se Connecter

1. Ouvrez l'application Fatora
2. Cliquez sur **"Se connecter"**
3. Entrez :
   - **Téléphone** : Le numéro que vous avez utilisé (ex: `22123456`)
   - **Mot de passe** : Le mot de passe en clair (ex: `Admin123`)
4. Cochez **"Rester connecté"** (optionnel)
5. Cliquez sur **"Se connecter"**

➡️ **Vous serez automatiquement connecté sans passer par l'écran d'activation !**

---

## 🔍 Vérification

Pour vérifier que le compte admin a été créé correctement :

```sql
SELECT
  phone,
  shop_name,
  role,
  status,
  activated_at
FROM users
WHERE role = 'admin';
```

Vous devriez voir :
- `role` = `admin`
- `status` = `active`
- `activated_at` = Date et heure actuelles

---

## 🎯 Caractéristiques du Compte Admin

Un compte administrateur :
- ✅ **Pas besoin de code d'activation**
- ✅ **Accès immédiat à l'application**
- ✅ **Status automatiquement "active"**
- ✅ **Accès aux fonctionnalités admin** (section `/admin`)

---

## 🛠️ Exemple Complet

Voici un exemple complet pour créer un admin :

**Mot de passe choisi** : `SuperAdmin2024`

**Étape 1** : Générer le hash
```javascript
hashPassword('SuperAdmin2024')
// Résultat : '1a2b3c4d_14_U3VwZXJBZG1p'
```

**Étape 2** : Créer le compte
```sql
SELECT create_admin_user(
  '22123456'::text,
  '1a2b3c4d_14_U3VwZXJBZG1p'::text,
  'Administration Principale'::text
);
```

**Étape 3** : Se connecter avec
- Téléphone : `22123456`
- Mot de passe : `SuperAdmin2024`

---

## ⚠️ Notes Importantes

1. **Sécurité** : Utilisez un mot de passe fort pour les comptes admin
2. **Téléphone unique** : Chaque numéro de téléphone ne peut être utilisé qu'une seule fois
3. **Pas de suppression** : Ne supprimez jamais le compte admin principal
4. **Plusieurs admins** : Vous pouvez créer plusieurs comptes admin en répétant ces étapes avec différents numéros de téléphone

---

## 🆘 Problèmes Courants

### "Ce numéro de téléphone existe déjà"
- Le numéro est déjà utilisé par un autre compte
- Utilisez un numéro différent ou supprimez l'ancien compte

### "Mot de passe incorrect"
- Vérifiez que vous avez bien utilisé le mot de passe en clair (pas le hash) pour vous connecter
- Vérifiez que le hash a été correctement généré

### "Je ne vois pas la section Admin"
- Assurez-vous que `role = 'admin'` dans la base de données
- Déconnectez-vous et reconnectez-vous pour rafraîchir la session

---

## 📞 Support

Pour toute question ou problème, contactez le développeur : **MD HAMDINOU**
