import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FontFamily } from '../theme/font';

interface ButtonConfig {
  text: string;
  onPress: () => void;
  destructive?: boolean;
}

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  primaryButton?: ButtonConfig;
  secondaryButton?: ButtonConfig;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function CustomAlertModal({
  visible,
  title,
  message,
  icon,
  iconColor,
  iconBgColor,
  primaryButton,
  secondaryButton,
  onClose,
}: CustomAlertModalProps) {
  const { colors } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const defaultIconColor = iconColor || colors.accent;
  const defaultIconBg = iconBgColor || (iconColor ? iconColor + '15' : colors.accent + '15');

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View 
          style={[
            styles.overlayBg, 
            { opacity: fadeAnim }
          ]} 
        />
        
        <Animated.View
          style={[
            styles.alertContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header Icon */}
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: defaultIconBg }]}>
              <Ionicons name={icon} size={32} color={defaultIconColor} />
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {secondaryButton && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  secondaryButton.onPress();
                }}
                style={[
                  styles.button,
                  styles.secondaryBtn,
                  { borderColor: colors.border },
                ]}
              >
                <Text 
                  style={[
                    styles.buttonText, 
                    { color: colors.textSecondary, fontFamily: FontFamily.poppinsMedium }
                  ]}
                >
                  {secondaryButton.text}
                </Text>
              </TouchableOpacity>
            )}

            {primaryButton && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  primaryButton.onPress();
                }}
                style={[
                  styles.button,
                  primaryButton.destructive 
                    ? styles.destructiveBtn 
                    : { backgroundColor: colors.accent },
                ]}
              >
                <Text 
                  style={[
                    styles.buttonText, 
                    { color: '#fff', fontFamily: FontFamily.poppinsBold }
                  ]}
                >
                  {primaryButton.text}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  alertContainer: {
    width: '100%',
    maxWidth: width * 0.88,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 19,
    fontFamily: FontFamily.poppinsBold,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    fontFamily: FontFamily.poppinsRegular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  destructiveBtn: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
