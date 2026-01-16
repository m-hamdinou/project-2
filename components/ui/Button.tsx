import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
    };

    switch (size) {
      case 'sm':
        base.paddingVertical = spacing.sm;
        base.paddingHorizontal = spacing.md;
        break;
      case 'md':
        base.paddingVertical = spacing.md;
        base.paddingHorizontal = spacing.lg;
        break;
      case 'lg':
        base.paddingVertical = spacing.lg;
        base.paddingHorizontal = spacing.xl;
        break;
    }

    switch (variant) {
      case 'primary':
        base.backgroundColor = disabled ? colors.textLight : colors.primary;
        break;
      case 'secondary':
        base.backgroundColor = disabled ? colors.textLight : colors.secondary;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 2;
        base.borderColor = disabled ? colors.textLight : colors.primary;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      case 'danger':
        base.backgroundColor = disabled ? colors.textLight : colors.error;
        break;
    }

    if (fullWidth) {
      base.width = '100%';
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: fontWeight.semibold,
    };

    switch (size) {
      case 'sm':
        base.fontSize = fontSize.sm;
        break;
      case 'md':
        base.fontSize = fontSize.md;
        break;
      case 'lg':
        base.fontSize = fontSize.lg;
        break;
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        base.color = colors.textOnPrimary;
        break;
      case 'outline':
      case 'ghost':
        base.color = disabled ? colors.textLight : colors.primary;
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textOnPrimary} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), icon ? { marginLeft: spacing.sm } : {}, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
