# Configuration du Code Administrateur

## Code par défaut

Par défaut, le code administrateur est : **`CHANGE_ME_IN_PRODUCTION`**

## Définir un code personnalisé

Pour définir votre propre code administrateur sécurisé, suivez ces étapes :

### 1. Accéder au Dashboard Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet

### 2. Configurer la variable d'environnement

1. Dans le menu de gauche, cliquez sur **Edge Functions**
2. Cliquez sur l'onglet **Secrets** (ou **Environment Variables**)
3. Cliquez sur **Add new secret**
4. Entrez les informations suivantes :
   - **Name** : `ADMIN_KEY`
   - **Value** : Votre code personnalisé (exemple: `MonCodeSecurise2024!`)
5. Cliquez sur **Save** ou **Add secret**

### 3. Redéployer les fonctions (si nécessaire)

Les Edge Functions devraient automatiquement utiliser le nouveau secret. Si ce n'est pas le cas, vous pouvez les redéployer depuis l'interface Supabase.

### 4. Utiliser votre nouveau code

Une fois configuré, utilisez votre nouveau code dans l'application :

1. Ouvrez l'application
2. Allez dans **Admin → Générer des codes**
3. Entrez votre nouveau code administrateur
4. Générez vos codes d'activation

## Recommandations de sécurité

Pour créer un code administrateur sécurisé :

✅ **À FAIRE :**
- Utilisez au moins 12 caractères
- Mélangez majuscules, minuscules, chiffres et symboles
- Exemple : `MyS3cur3K3y!2024`

❌ **À ÉVITER :**
- Mots de passe simples comme `admin123`
- Informations personnelles (nom, date de naissance)
- Codes trop courts

## Vérification

Pour vérifier que votre code fonctionne :

1. Allez sur la page Admin de l'application
2. Essayez de générer des codes avec votre nouveau code admin
3. Si ça fonctionne, la configuration est correcte ✅

## Dépannage

Si vous obtenez une erreur "Unauthorized: Invalid admin key" :

1. Vérifiez que le nom du secret est exactement `ADMIN_KEY` (sensible à la casse)
2. Vérifiez qu'il n'y a pas d'espaces avant/après dans le code
3. Attendez quelques secondes que Supabase applique les changements
4. Essayez de recharger l'application
