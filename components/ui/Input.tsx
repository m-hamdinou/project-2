import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps, ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export function Input({
  label,
  error,
  isPassword = false,
  containerStyle,
  required = false,
  style,
  ...props
}: InputProps) {
  const { isRTL } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, isRTL && styles.labelRTL]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          style={[
            styles.input,
            isRTL && styles.inputRTL,
            isPassword && styles.inputWithIcon,
            style,
          ]}
          placeholderTextColor={colors.textLight}
          secureTextEntry={isPassword && !showPassword}
          textAlign={isRTL ? 'right' : 'left'}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color={colors.textSecondary} />
            ) : (
              <Eye size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, isRTL && styles.errorRTL]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  labelRTL: {
    textAlign: 'right',
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  inputRTL: {
    textAlign: 'right',
  },
  inputWithIcon: {
    paddingRight: 50,
  },
  iconButton: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.xs,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  errorRTL: {
    textAlign: 'right',
  },
});
