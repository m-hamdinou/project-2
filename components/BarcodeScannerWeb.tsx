// components/BarcodeScannerWeb.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform, TextInput, Vibration } from 'react-native';
import { X, Camera, Keyboard, CheckCircle2, AlertCircle, Play, ExternalLink, Copy, Pause, RotateCcw } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { initDynamsoftScanner, scanFromLiveVideo } from '@/features/scanner/scannerCore';
import { isInAppBrowser, copyUrlToClipboard, openInExternalBrowser } from '@/lib/browserDetection';

interface BarcodeScannerWebProps {
  visible: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
  context: 'STOCK' | 'INVOICE';
  continuous?: boolean;
}

export function BarcodeScannerWeb({ visible, onClose, onDetected, context, continuous = false }: BarcodeScannerWebProps) {
  const [status, setStatus] = useState<'IDLE' | 'STARTING' | 'LIVE' | 'PAUSED' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastScanned, setLastScanned] = useState<{ code: string; time: number } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isInApp, setIsInApp] = useState(false);

  const videoRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const timeoutRef = useRef<any>();

  useEffect(() => {
    if (visible) {
      // Détecter si on est dans un in-app browser
      setIsInApp(isInAppBrowser());
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [visible]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('IDLE');
    setLastScanned(null);
    setScannedCount(0);
  };

  const startCamera = async () => {
    console.log("🎬 Démarrage caméra...");
    setStatus('STARTING');
    setErrorMsg('');

    try {
      await initDynamsoftScanner();
      console.log("✅ Dynamsoft OK");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      console.log("✅ Stream OK");
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // ✅ PASSAGE IMMÉDIAT À LIVE
      console.log("✅ LIVE");
      setStatus('LIVE');
      
      // Démarrer le scan après un court délai
      setTimeout(scanLoop, 300);
      
    } catch (err: any) {
      console.error("❌ Erreur:", err.message);
      setErrorMsg(err.message);
      setStatus('ERROR');
    }
  };

  const pauseCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    setStatus('PAUSED');
  };

  const resumeCamera = () => {
    setStatus('LIVE');
    scanLoop();
  };

  const scanLoop = async () => {
    if (status !== 'LIVE' || !videoRef.current) return;

    try {
      const code = await scanFromLiveVideo(videoRef.current);
      
      if (code) {
        const now = Date.now();
        
        // Anti-double scan (800ms throttling)
        if (!lastScanned || lastScanned.code !== code || now - lastScanned.time > 800) {
          console.log("🎯 DÉTECTÉ:", code);
          setLastScanned({ code, time: now });
          setScannedCount(prev => prev + 1);
          
          // Vibration feedback (si disponible)
          if (Platform.OS !== 'web' && Vibration) {
            Vibration.vibrate(100);
          }
          
          onDetected(code);
          
          if (!continuous) {
            // Mode simple : fermer après détection
            setStatus('SUCCESS');
            setTimeout(() => {
              cleanup();
              onClose();
            }, 800);
            return;
          }
        }
      }
    } catch (e) {}

    // Continuer (4 FPS pour économiser CPU)
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(scanLoop);
    }, 250);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onDetected(manualCode.trim());
      if (!continuous) {
        setTimeout(onClose, 600);
      } else {
        setManualCode('');
      }
    }
  };

  const handleCopyUrl = async () => {
    const success = await copyUrlToClipboard();
    if (success) {
      alert("Lien copié ! Ouvrez-le dans Safari ou Chrome");
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SCANNER - {context}</Text>
          <TouchableOpacity onPress={() => { cleanup(); onClose(); }}>
            <X size={28} color={colors.surface} />
          </TouchableOpacity>
        </View>

        <View style={styles.main}>
          {/* IN-APP BROWSER WARNING */}
          {isInApp && (
            <View style={styles.warningBox}>
              <AlertCircle size={48} color={colors.warning} />
              <Text style={styles.warningTitle}>Navigateur non compatible</Text>
              <Text style={styles.warningText}>
                Le scan ne fonctionne pas dans {'\n'}
                WhatsApp/Instagram/Facebook.{'\n\n'}
                Veuillez ouvrir ce lien dans Safari (iOS) ou Chrome (Android).
              </Text>
              <TouchableOpacity style={styles.btnWarning} onPress={handleCopyUrl}>
                <Copy size={20} color={colors.surface} />
                <Text style={styles.btnText}>COPIER LE LIEN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={openInExternalBrowser}>
                <ExternalLink size={20} color={colors.primary} />
                <Text style={[styles.btnText, { color: colors.primary }]}>OUVRIR DANS NAVIGATEUR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 30 }} onPress={() => setShowManual(true)}>
                <Text style={styles.linkText}>OU : Saisie manuelle</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* MANUEL */}
          {!isInApp && showManual && (
            <View style={styles.manualArea}>
              <Keyboard size={64} color={colors.primary} />
              <Text style={styles.title}>Saisie Manuelle</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 3012345678901"
                value={manualCode}
                onChangeText={setManualCode}
                keyboardType="numeric"
                autoFocus
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={handleManualSubmit}>
                <Text style={styles.btnText}>VALIDER</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowManual(false)} style={{ marginTop: 20 }}>
                <Text style={styles.linkText}>Retour au scanner</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* IDLE - Bouton démarrer */}
          {!isInApp && !showManual && status === 'IDLE' && (
            <View style={styles.centerBox}>
              <Camera size={80} color={colors.primary} />
              <Text style={styles.title}>Prêt à scanner</Text>
              <Text style={styles.desc}>
                Le scanner va démarrer en temps réel. Présentez les codes-barres devant la caméra.
              </Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={startCamera}>
                <Play size={24} color={colors.surface} />
                <Text style={styles.btnText}>DÉMARRER LE SCAN</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STARTING */}
          {status === 'STARTING' && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.statusText}>Démarrage de la caméra...</Text>
              <TouchableOpacity 
                style={[styles.btnSecondary, { marginTop: 30 }]} 
                onPress={() => setShowManual(true)}
              >
                <Keyboard size={20} color={colors.primary} />
                <Text style={[styles.btnText, { color: colors.primary }]}>PASSER EN MANUEL</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* LIVE */}
          {status === 'LIVE' && (
            <View style={styles.liveContainer}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <View style={styles.overlay}>
                <View style={styles.reticle} />
                <Text style={styles.hint}>Placez le code-barres dans le cadre</Text>
                
                {continuous && scannedCount > 0 && (
                  <View style={styles.counter}>
                    <CheckCircle2 size={20} color={colors.surface} />
                    <Text style={styles.counterText}>{scannedCount} article{scannedCount > 1 ? 's' : ''}</Text>
                  </View>
                )}

                {lastScanned && (
                  <View style={styles.lastScanned}>
                    <CheckCircle2 size={16} color={colors.success} />
                    <Text style={styles.lastScannedText}>✓ {lastScanned.code}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.pauseBtn} onPress={pauseCamera}>
                  <Pause size={20} color={colors.surface} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* PAUSED */}
          {status === 'PAUSED' && (
            <View style={styles.centerBox}>
              <Pause size={64} color={colors.warning} />
              <Text style={styles.title}>Scan en pause</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={resumeCamera}>
                <Play size={24} color={colors.surface} />
                <Text style={styles.btnText}>REPRENDRE</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ERROR */}
          {status === 'ERROR' && !isInApp && (
            <View style={styles.centerBox}>
              <AlertCircle size={64} color={colors.error} />
              <Text style={styles.title}>Caméra indisponible</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <Text style={styles.desc}>
                Vérifiez les permissions ou réessayez.
              </Text>
              <TouchableOpacity style={styles.btnRetry} onPress={startCamera}>
                <RotateCcw size={20} color={colors.surface} />
                <Text style={styles.btnText}>RÉESSAYER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowManual(true)}>
                <Keyboard size={20} color={colors.primary} />
                <Text style={[styles.btnText, { color: colors.primary }]}>SAISIE MANUELLE</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SUCCESS */}
          {status === 'SUCCESS' && (
            <View style={styles.centerBox}>
              <CheckCircle2 size={80} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>CODE DÉTECTÉ !</Text>
            </View>
          )}
        </View>

        {/* FOOTER */}
        {!showManual && !isInApp && status === 'LIVE' && (
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => setShowManual(true)} style={styles.footerBtn}>
              <Keyboard size={24} color={colors.primary} />
              <Text style={styles.footerText}>MANUEL</Text>
            </TouchableOpacity>
            {continuous && (
              <TouchableOpacity onPress={() => { cleanup(); onClose(); }} style={styles.footerBtn}>
                <CheckCircle2 size={24} color={colors.success} />
                <Text style={[styles.footerText, { color: colors.success }]}>TERMINER ({scannedCount})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, backgroundColor: colors.primary },
  headerTitle: { color: colors.surface, fontWeight: 'bold', fontSize: 14 },
  main: { flex: 1 },
  liveContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  reticle: { width: 280, height: 180, borderWidth: 3, borderColor: colors.primary, borderRadius: 15, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 },
  hint: { color: colors.surface, marginTop: 20, fontWeight: 'bold', fontSize: 16, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  counter: { position: 'absolute', top: 40, backgroundColor: colors.success, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 5 },
  counterText: { color: colors.surface, fontWeight: 'bold', fontSize: 18 },
  lastScanned: { position: 'absolute', bottom: 140, backgroundColor: 'rgba(16, 185, 129, 0.95)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 3 },
  lastScannedText: { color: colors.surface, fontWeight: 'bold', fontSize: 14 },
  pauseBtn: { position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 25 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  warningBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  warningTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginTop: 20, textAlign: 'center' },
  warningText: { textAlign: 'center', color: colors.textSecondary, marginTop: 15, lineHeight: 24, fontSize: 15 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 20, color: colors.text },
  desc: { textAlign: 'center', color: colors.textSecondary, marginTop: 15, lineHeight: 22 },
  errorText: { textAlign: 'center', color: colors.error, marginTop: 10, fontSize: 14 },
  statusText: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 18, paddingHorizontal: 35, borderRadius: 20, gap: 12, marginTop: 25, elevation: 5 },
  btnRetry: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.text, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15, gap: 10, marginTop: 20 },
  btnWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15, gap: 10, marginTop: 20 },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15, gap: 10, marginTop: 15, borderWidth: 2, borderColor: colors.primary },
  btnText: { color: colors.surface, fontWeight: 'bold', fontSize: 16 },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, padding: 20, justifyContent: 'space-around', backgroundColor: colors.surface },
  footerBtn: { alignItems: 'center', gap: 8 },
  footerText: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
  manualArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  input: { width: '100%', height: 65, backgroundColor: colors.surface, borderRadius: 15, borderWidth: 2, borderColor: colors.primary, textAlign: 'center', fontSize: 24, marginVertical: 30, paddingHorizontal: 10 },
  linkText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
});
