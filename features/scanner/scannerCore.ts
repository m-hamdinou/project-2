// features/scanner/scannerCore.ts
import { Platform } from 'react-native';

// ✅ LICENCE DYNAMSOFT DLS2 (Officielle - localhost)
const DYNAMSOFT_LICENSE = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTA1MDQzNzQ1LU1UQTFNRFF6TnpRMUxYZGxZaTFVY21saGJGQnliMm8iLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tZGxzLmR5bmFtc29mdG9ubGluZS5jb20vIiwib3JnYW5pemF0aW9uSUQiOiIxMDUwNDM3NDUiLCJzdGFuZGJ5U2VydmVyVVJMIjoiaHR0cHM6Ly9zZGxzLmR5bmFtc29mdG9ubGluZS5jb20vIiwiY2hlY2tDb2RlIjoxMjEyNTQ2MDA5fQ==";

let initialized = false;

/**
 * Charge et initialise Dynamsoft Barcode Reader
 */
export async function initDynamsoftScanner(): Promise<void> {
  if (Platform.OS !== 'web') return;
  if (initialized) return;

  console.log("🚀 Initialisation de Dynamsoft...");

  try {
    // Charger le SDK depuis le CDN
    if (!(window as any).Dynamsoft) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.20/dist/dbr.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const DBR = (window as any).Dynamsoft.DBR;
    
    // Configurer la licence DLS2
    DBR.BarcodeReader.license = DYNAMSOFT_LICENSE;
    console.log("🔑 Licence DLS2 configurée");

    // Charger le moteur WASM
    await DBR.BarcodeReader.loadWasm();
    console.log("✅ Dynamsoft opérationnel !");

    initialized = true;
  } catch (error: any) {
    console.error("❌ Erreur init Dynamsoft:", error);
    throw error;
  }
}

/**
 * Scanne un fichier image et retourne le code-barres détecté
 */
export async function scanBarcodeFromFile(file: File): Promise<string | null> {
  await initDynamsoftScanner();

  console.log(`📸 Scan de ${file.name}`);

  try {
    const DBR = (window as any).Dynamsoft.DBR;
    const reader = await DBR.BarcodeReader.createInstance();

    // Configuration optimale pour EAN13/EAN8/CODE128
    const settings = await reader.getRuntimeSettings();
    settings.barcodeFormatIds = DBR.EnumBarcodeFormat.BF_ALL;
    settings.deblurLevel = 9;
    settings.scaleDownThreshold = 2300;
    await reader.updateRuntimeSettings(settings);

    const results = await reader.decode(file);

    if (results && results.length > 0) {
      console.log("✅ DÉTECTÉ:", results[0].barcodeText);
      return results[0].barcodeText;
    }

    console.log("❌ Aucun code trouvé");
    return null;
  } catch (error: any) {
    console.error("❌ Erreur scan:", error.message);
    return null;
  }
}

/**
 * Scan depuis un flux vidéo LIVE (Scan en continu)
 * Retourne le code dès qu'il est détecté
 */
export async function scanFromLiveVideo(videoElement: HTMLVideoElement): Promise<string | null> {
  await initDynamsoftScanner();

  try {
    const DBR = (window as any).Dynamsoft.DBR;
    const reader = await DBR.BarcodeReader.createInstance();
    
    // Config rapide pour scan en continu
    const settings = await reader.getRuntimeSettings();
    settings.barcodeFormatIds = DBR.EnumBarcodeFormat.BF_ALL;
    settings.deblurLevel = 3; // Moins élevé pour plus de vitesse
    settings.expectedBarcodesCount = 1;
    await reader.updateRuntimeSettings(settings);

    const results = await reader.decode(videoElement);

    if (results && results.length > 0) {
      return results[0].barcodeText;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Informations de debug
 */
export async function getScannerDebugInfo(): Promise<any> {
  let cameraPermission = 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'camera' as any });
    cameraPermission = status.state;
  } catch (e) {}

  return {
    isSecureContext: window.isSecureContext,
    getUserMediaSupported: !!(navigator.mediaDevices?.getUserMedia),
    cameraPermission,
    dynamsoftInitialized: initialized,
    dynamsoftVersion: initialized ? '9.6.20' : 'N/A'
  };
}
