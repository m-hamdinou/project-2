import React, { useState, useEffect } from 'react';
import { Platform, KeyboardAvoidingView, ScrollView, StyleSheet, TouchableOpacity, View, Text, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { Button, Input } from '@/components/ui';

export default function AddProductScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ barcode?: string; returnToInvoice?: string }>();

  const [saving, setSaving] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    price_sell: '',
    price_buy: '',
    stock_qty: '',
    alert_threshold: '5',
    category: '',
    barcode: '',
  });

  useEffect(() => {
    if (params.barcode) {
      setNewProduct((prev) => ({ ...prev, barcode: String(params.barcode) }));
    }
  }, [params.barcode]);

  const handleAddProduct = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    // Validation des champs requis
    if (!newProduct.name?.trim()) {
      Alert.alert('Champ requis', 'Le nom du produit est obligatoire.');
      return;
    }

    if (!newProduct.price_sell?.trim()) {
      Alert.alert('Champ requis', 'Le prix de vente est obligatoire.');
      return;
    }

    // Validation du prix de vente
    const priceSell = parseFloat(newProduct.price_sell);
    if (isNaN(priceSell) || priceSell < 0) {
      Alert.alert('Erreur de saisie', 'Le prix de vente doit être un nombre positif.');
      return;
    }

    // Validation du prix d'achat (optionnel mais doit être valide si renseigné)
    if (newProduct.price_buy?.trim()) {
      const priceBuy = parseFloat(newProduct.price_buy);
      if (isNaN(priceBuy) || priceBuy < 0) {
        Alert.alert('Erreur de saisie', 'Le prix d\'achat doit être un nombre positif.');
        return;
      }
    }

    // Validation du stock (optionnel mais doit être valide si renseigné)
    if (newProduct.stock_qty?.trim()) {
      const stockQty = parseInt(newProduct.stock_qty, 10);
      if (isNaN(stockQty) || stockQty < 0) {
        Alert.alert('Erreur de saisie', 'Le stock doit être un nombre entier positif.');
        return;
      }
    }

    // Validation du seuil d'alerte
    const alertThreshold = parseInt(newProduct.alert_threshold || '5', 10);
    if (isNaN(alertThreshold) || alertThreshold < 0) {
      Alert.alert('Erreur de saisie', 'Le seuil d\'alerte doit être un nombre entier positif.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: newProduct.name.trim(),
        price_sell: priceSell,
        price_buy: newProduct.price_buy?.trim() ? parseFloat(newProduct.price_buy) : 0,
        stock_qty: newProduct.stock_qty?.trim() ? parseInt(newProduct.stock_qty, 10) : 0,
        alert_threshold: alertThreshold,
        category: newProduct.category?.trim() || '',
        barcode: newProduct.barcode?.trim() || null,
      };

      const { data, error } = await supabase.from('products').insert(payload).select().single();

      if (error) {
        console.error('Error adding product:', error);
        if (error.code === '23505') {
          Alert.alert('Erreur', 'Ce code-barres existe déjà. Veuillez utiliser un autre code.');
        } else if (error.code === '23503') {
          Alert.alert('Erreur', 'Erreur de référence. Vérifiez vos données.');
        } else {
          Alert.alert(
            'Erreur',
            `Impossible d'ajouter le produit.\n\n${error.message || 'Vérifiez votre connexion.'}`
          );
        }
        setSaving(false);
        return;
      }

      // Réinitialiser le formulaire
      setNewProduct({
        name: '',
        price_sell: '',
        price_buy: '',
        stock_qty: '',
        alert_threshold: '5',
        category: '',
        barcode: '',
      });

      // Navigation selon le contexte
      if (params.returnToInvoice && data) {
        router.push({
          pathname: '/invoice/new',
          params: { scannedProductId: data.id },
        });
      } else {
        // Retourner à la liste des produits (elle se rafraîchira automatiquement)
        router.back();
      }
    } catch (e: any) {
      console.error('Error adding product:', e);
      Alert.alert('Erreur', e.message || 'Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.stock.addProduct}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <Input
            label="Code-barres"
            value={newProduct.barcode}
            onChangeText={(text) => setNewProduct({ ...newProduct, barcode: text })}
            editable={!params.barcode}
          />

          <Input
            label={t.stock.productName}
            value={newProduct.name}
            onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
            required
          />

          <Input
            label={t.stock.sellPrice}
            value={newProduct.price_sell}
            onChangeText={(text) => setNewProduct({ ...newProduct, price_sell: text })}
            keyboardType="numeric"
            required
          />

          <Input
            label={t.stock.buyPrice}
            value={newProduct.price_buy}
            onChangeText={(text) => setNewProduct({ ...newProduct, price_buy: text })}
            keyboardType="numeric"
          />

          <Input
            label={t.stock.currentStock}
            value={newProduct.stock_qty}
            onChangeText={(text) => setNewProduct({ ...newProduct, stock_qty: text })}
            keyboardType="numeric"
          />

          <Input
            label={t.stock.alertThreshold}
            value={newProduct.alert_threshold}
            onChangeText={(text) => setNewProduct({ ...newProduct, alert_threshold: text })}
            keyboardType="numeric"
          />

          <Input
            label={t.stock.category}
            value={newProduct.category}
            onChangeText={(text) => setNewProduct({ ...newProduct, category: text })}
          />

          <Button
            title={saving ? t.common.loading : t.common.save}
            onPress={handleAddProduct}
            disabled={saving}
            style={{ marginTop: spacing.md }}
          />

          {/* Espace en bas pour iPhone */}
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRTL: { flexDirection: 'row-reverse' },

  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  textRTL: { textAlign: 'right' },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
});
