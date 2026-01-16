# Compte Administrateur

## Informations de connexion

Le compte administrateur par défaut est configuré avec les identifiants suivants :

```
Téléphone: 99999999
Mot de passe: Admin123
```

## Accès à l'interface admin

1. Lancez l'application
2. Connectez-vous avec les identifiants ci-dessus
3. Accédez à l'onglet "Paramètres"
4. Cliquez sur "Panel Admin" en haut de l'écran

## Gestion des codes d'activation

### Clé administrateur

Pour générer de nouveaux codes d'activation, vous aurez besoin de la **clé administrateur**.

Par défaut, la clé est : `123456`

### Générer des codes

1. Dans le panel admin, cliquez sur "Générer de nouveaux codes"
2. Entrez la clé administrateur : `123456`
3. Définissez le nombre de codes à générer (1-1000)
4. Choisissez la durée de validité en jours
5. Cliquez sur "Générer"

### Visualiser les codes existants

L'interface admin affiche automatiquement :
- **Total** : Nombre total de codes
- **Disponibles** : Codes non utilisés et non expirés
- **Utilisés** : Codes déjà activés
- **Expirés** : Codes non utilisés mais expirés

Chaque code affiche :
- Le code d'activation
- Son statut (Disponible, Utilisé, Expiré)
- Sa date d'expiration
- Le numéro de téléphone de l'utilisateur (si utilisé)

## Notes importantes

- Chaque code ne peut être utilisé qu'une seule fois
- Les codes expirés ne peuvent plus être utilisés
- Sauvegardez les codes générés avant de quitter la page
- La clé administrateur est requise pour toute génération de codes

## Sécurité

Pour modifier la clé administrateur :
1. Allez dans les variables d'environnement Supabase
2. Modifiez la valeur de `ADMIN_KEY`
3. Redéployez l'edge function `generate-codes`
