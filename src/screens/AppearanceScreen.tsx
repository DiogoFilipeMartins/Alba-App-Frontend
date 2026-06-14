import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ColorPalette } from '../contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Appearance'>;

export default function AppearanceScreen({ navigation }: Props) {
  const { colors, isDark, colorTheme, toggleTheme, setColorTheme } = useTheme();

  const themesList = [
    {
      id: 'teal' as ColorPalette,
      name: 'Floresta Calma',
      description: 'Verde e azul-petróleo suaves. Promove equilíbrio e relaxamento mental.',
      primaryColor: '#0f766e',
      accentColor: '#14b8a6',
    },
    {
      id: 'blue' as ColorPalette,
      name: 'Céu Suave',
      description: 'Tons de azul reconfortantes. Excelente para reduzir ansiedade e sobrecarga sensorial.',
      primaryColor: '#0369a1',
      accentColor: '#0ea5e9',
    },
    {
      id: 'warm' as ColorPalette,
      name: 'Pôr do Sol Acolhedor',
      description: 'Tons creme e terra quentes. Ideal para sensibilidade à luz azul (glare).',
      primaryColor: '#b45309',
      accentColor: '#d97706',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Aparência</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Intro description */}
        <View style={styles.introBox}>
          <Ionicons name="eye-outline" size={28} color={colors.accent} />
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
            Design Amigo do Autismo
          </Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            As nossas cores foram desenhadas com baixa saturação e contraste equilibrado para evitar a fadiga ocular e a sobrecarga sensorial, oferecendo uma experiência visual calma e confortável.
          </Text>
        </View>

        {/* Mode Switch Card */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Geral</Text>
        <TouchableOpacity
          style={[styles.card, styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={20}
                color={colors.accent}
              />
            </View>
            <View>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Modo Escuro</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                {isDark ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFF"
          />
        </TouchableOpacity>

        {/* Palette Selector */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Paleta de Cores Sensoriais</Text>
        {themesList.map((theme) => {
          const isSelected = colorTheme === theme.id;
          return (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.card,
                styles.themeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1
                }
              ]}
              onPress={() => setColorTheme(theme.id)}
              activeOpacity={0.7}
            >
              <View style={styles.themeHeader}>
                <Text style={[styles.themeName, { color: colors.textPrimary }]}>
                  {theme.name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </View>
              <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>
                {theme.description}
              </Text>

              {/* Color Previews */}
              <View style={styles.previewsRow}>
                <View style={[styles.colorPreview, { backgroundColor: theme.primaryColor }]} />
                <View style={[styles.colorPreview, { backgroundColor: theme.accentColor }]} />
                <View style={[styles.colorPreview, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  introBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#0ea5e910',
    marginBottom: 25,
  },
  introTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginTop: 8,
    marginBottom: 4,
  },
  introText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: -2,
  },
  themeCard: {
    gap: 8,
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  themeDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  previewsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
