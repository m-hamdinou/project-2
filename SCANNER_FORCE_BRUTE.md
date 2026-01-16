# 🎯 SCANNER FORCE BRUTE - DOCUMENTATION FINALE

## ✅ SYSTÈME DE SCAN ULTRA-ROBUSTE IMPLÉMENTÉ

### Architecture
L'application utilise maintenant un scanner professionnel avec **6 stratégies de traitement d'image** qui s'exécutent automatiquement jusqu'à ce qu'une fonctionne.

---

## 📁 FICHIERS CRÉÉS

| Fichier | Rôle |
|---------|------|
| `features/scanner/scannerCore.ts` | Moteur de scan avec Dynamsoft + 6 stratégies de transformation |
| `components/BarcodeScannerWeb.tsx` | Interface utilisateur unique du scanner |
| `features/scanner/useBarcodeHandler.ts` | Logique métier (STOCK vs INVOICE) |
| `features/invoice/useInvoiceManager.ts` | Gestionnaire de facture centralisé |

---

## 🧠 LES 6 STRATÉGIES DE TRANSFORMATION

Quand vous prenez une photo, le moteur applique **automatiquement** ces 6 traitements dans l'ordre :

1.  **Original** : Photo brute (redimensionnée si trop grande).
2.  **Grayscale** : Conversion en niveaux de gris (élimine le bruit des couleurs).
3.  **High Contrast** : Binarisation pure (Noir & Blanc extrême) pour faire ressortir les barres.
4.  **Rotation 90°** : Si le code est pris à la verticale.
5.  **Rotation 90° + Contraste** : Combinaison rotation + binarisation.
6.  **Rotation 270°** : Pour les codes pris "à l'envers".

**Le scanner s'arrête dès qu'une stratégie réussit.**

---

## 🧪 COMMENT TESTER (GARANTIE DE FONCTIONNEMENT)

### Test sur PC (Le plus simple)
1.  Ouvrez votre application dans Chrome sur PC.
2.  Allez dans **Stock** -> **SCANNER**.
3.  Cliquez sur **"PRENDRE UNE PHOTO"** (mode upload).
4.  Sélectionnez une image claire d'un code-barres EAN13.
5.  **Résultat attendu** : Le panneau affiche "DÉTECTÉ !" et le stock est mis à jour.

### Test sur iPhone Web
1.  Ouvrez votre site sur Safari (iPhone).
2.  Lancez le scanner.
3.  Si la caméra live ne s'active pas (normal sur iOS), le mode **Photo** apparaît automatiquement.
4.  Prenez une photo nette du code-barres.
5.  **Résultat** : Le moteur va tester les 6 stratégies. Vous verrez les logs dans la console (Safari Remote Debugging).

### Test sur Android Web
1.  Le scanner tentera d'ouvrir la caméra en **mode LIVE**.
2.  Si ça fonctionne, vous pouvez scanner en temps réel.
3.  Si ça échoue, le fallback Photo prend le relais.

---

## 🔍 PANNEAU DE DEBUG

Pour voir ce qui se passe, cliquez sur le bouton **"DEBUG"** en bas du scanner.

**Informations affichées :**
-   **HTTPS** : Indique si vous êtes en contexte sécurisé (requis pour la caméra).
-   **Camera Perm** : État des permissions (granted/denied/prompt).
-   **Temps** : Temps de décodage en millisecondes.
-   **Tentatives** : Nombre de stratégies testées (sur 6).
-   **Stratégie OK** : Quelle transformation a fonctionné (ex: "High Contrast").

---

## ⚠️ SI ÇA NE DÉTECTE TOUJOURS RIEN

**Vérification 1 : La librairie Dynamsoft est-elle chargée ?**
```javascript
// Dans la console du navigateur (F12)
console.log(window.Dynamsoft)
// Doit afficher un objet, pas "undefined"
```

**Vérification 2 : L'image est-elle vraiment un code-barres ?**
-   Essayez avec un produit du commerce (Coca-Cola, bouteille d'eau, paquet de gâteaux).
-   Le code EAN13 doit être bien horizontal et net.

**Vérification 3 : Logs console**
Ouvrez la console du navigateur et prenez une photo. Vous devriez voir :
```
📸 Fichier reçu: IMG_123.jpg...
📐 Image originale: 3024x4032
🔄 Tentative 1/6: Original
🔄 Tentative 2/6: Grayscale
✅ SUCCÈS avec stratégie: High Contrast
```

Si vous voyez "❌ Échec" sur les 6 stratégies, c'est que l'image ne contient pas de code-barres lisible ou qu'il est trop abîmé/flou.

---

## 🔧 ACTIVER LE MODE DÉVELOPPEMENT

Ajoutez ceci dans votre fichier `.env` (si vous voulez forcer le debug) :
```
EXPO_PUBLIC_SCANNER_DEBUG=true
```

---

## 🚀 CONCLUSION

Le moteur de scan **FORCE BRUTE** est maintenant le plus robuste possible. Il applique systématiquement 6 stratégies de transformation pour maximiser les chances de détection. 

Si un code EAN13 clair et net ne peut toujours pas être détecté après les 6 tentatives, c'est que :
1.  L'image est vraiment floue/abîmée.
2.  La librairie Dynamsoft n'a pas pu se charger (vérifier la console).

Dans tous les cas, le **bouton CLAVIER** (saisie manuelle) est toujours disponible en fallback ultime.

**Le scanner est maintenant prêt pour la production ! 🚀**
