import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { getProductByBarcode } from '@/features/products/productService';

export type ScannerContext = 'STOCK' | 'INVOICE';

interface HandleBarcodeParams {
  barcode: string;
  context: ScannerContext;
  userId: string;
  onProductFound: (product: any) => void;
  onProductNotFound: (barcode: string) => void;
}

export function useBarcodeHandler() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<{ code: string; time: number } | null>(null);

  const handleBarcode = useCallback(async ({ 
    barcode, 
    context, 
    userId, 
    onProductFound, 
    onProductNotFound 
  }: HandleBarcodeParams) => {
    const cleanBarcode = barcode.trim().replace(/\s/g, '');
    const now = Date.now();

    // Anti-double scan (1 seconde)
    if (lastProcessed && lastProcessed.code === cleanBarcode && now - lastProcessed.time < 1000) {
      console.log("🚫 Double scan ignoré");
      return;
    }

    setIsProcessing(true);
    setLastProcessed({ code: cleanBarcode, time: now });

    console.log(`📡 [${context}] Recherche: ${cleanBarcode}`);

    try {
      const product = await getProductByBarcode(userId, cleanBarcode);

      if (context === 'STOCK') {
        // --- MODE STOCK : TOUJOURS OUVRIR LE FORMULAIRE D'ENREGISTREMENT ---
        // Permet de créer un nouveau produit ou modifier un existant
        if (product) {
          console.log("📦 STOCK: Produit existant, ouverture pour modification");
        } else {
          console.log("📦 STOCK: Nouveau produit, ouverture du formulaire");
        }
        onProductNotFound(cleanBarcode); // Ouvre le formulaire avec le code pré-rempli
        
      } else if (context === 'INVOICE') {
        // --- MODE FACTURE : AJOUTER PRODUIT EXISTANT OU PROPOSER CRÉATION ---
        if (product) {
          console.log("✅ FACTURE: Produit trouvé, ajout à la facture");
          onProductFound(product);
        } else {
          console.log("❌ FACTURE: Produit inconnu");
          Alert.alert(
            "Produit inconnu", 
            "Ce code n'existe pas dans votre stock. Voulez-vous créer ce produit ?",
            [
              { text: "Annuler", style: "cancel" },
              { 
                text: "Créer le produit", 
                onPress: () => onProductNotFound(cleanBarcode) 
              }
            ]
          );
        }
      }
    } catch (error: any) {
      console.error("❌ Erreur:", error.message);
      Alert.alert("Erreur", error.message || "Problème de connexion à la base de données");
    } finally {
      setIsProcessing(false);
    }
  }, [lastProcessed]);

  return { handleBarcode, isProcessing };
}
