// lib/browserDetection.ts

/**
 * Détecte si l'app est ouverte dans un navigateur intégré (in-app browser)
 * Ces navigateurs bloquent souvent l'accès à la caméra
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Détection des navigateurs in-app courants
  const inAppPatterns = [
    /FBAN|FBAV/i, // Facebook
    /Instagram/i, // Instagram
    /WhatsApp/i, // WhatsApp
    /Line/i, // Line
    /Messenger/i, // Facebook Messenger
    /Twitter/i, // Twitter in-app
    /Snapchat/i, // Snapchat
    /TikTok/i, // TikTok
    /LinkedIn/i // LinkedIn
  ];

  return inAppPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Récupère l'URL actuelle pour la copier
 */
export function getCurrentUrl(): string {
  return window.location.href;
}

/**
 * Copie l'URL dans le presse-papiers
 */
export async function copyUrlToClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getCurrentUrl());
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Ouvre l'URL dans le navigateur externe (Safari/Chrome)
 */
export function openInExternalBrowser(): void {
  const url = getCurrentUrl();
  
  // Tentative d'ouverture dans le navigateur par défaut
  // Sur iOS, cela ouvrira Safari
  // Sur Android, cela ouvrira Chrome ou le navigateur par défaut
  window.open(url, '_blank');
}
