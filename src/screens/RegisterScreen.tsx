import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, Alert,
  ActivityIndicator, ScrollView, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;
type AccountType = 'user' | 'professional' | 'institution';

const ACCOUNT_TYPES: { type: AccountType; icon: any; label: string; description: string; color: string }[] = [
  {
    type: 'user',
    icon: 'person',
    label: 'Utilizador',
    description: 'Familiar, pessoa autista ou cuidador à procura de recursos e comunidade.',
    color: '#0369a1',
  },
  {
    type: 'professional',
    icon: 'medkit',
    label: 'Profissional',
    description: 'Terapeuta, psicólogo, médico ou outro profissional de saúde.',
    color: '#0f766e',
  },
  {
    type: 'institution',
    icon: 'business',
    label: 'Instituição',
    description: 'Clínica, centro de reabilitação, associação ou escola.',
    color: '#7c3aed',
  },
];

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { colors, isDark } = useTheme();

  // Step 1: Account type
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType>('user');

  // Step 2: Base fields
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Extra fields for prof/institution
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const specialtyRef = useRef<TextInput>(null);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const isProfOrInst = accountType === 'professional' || accountType === 'institution';
  const selectedType = ACCOUNT_TYPES.find(t => t.type === accountType)!;

  const handleRegister = useCallback(async () => {
    setError(null);
    if (username.length < 3) {
      setError('O nome deve ter pelo menos 3 caracteres.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Por favor, insira um email válido.');
      return;
    }
    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    try {
      setLoading(true);
      await signUp({
        email,
        password,
        username,
        phone: phone.trim() || undefined,
        account_type: accountType,
        specialty: specialty.trim() || undefined,
        bio: bio.trim() || undefined,
        website: website.trim() || undefined,
      });
      Alert.alert(
        'Conta criada! 🎉',
        accountType === 'user'
          ? 'Verifica a tua caixa de entrada para confirmar o email.'
          : 'Conta criada com sucesso! A tua verificação será analisada pela nossa equipa em breve.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (e: any) {
      setError(e?.message || 'Ocorreu um erro inesperado. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, accountType, specialty, bio, website, navigation, signUp]);

  // --- Step 1: Account type selection ---
  if (step === 1) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>

          <View style={styles.stepHeader}>
            <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Passo 1 de 2</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Que tipo de conta{'\n'}precisas?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Escolhe o tipo de conta que melhor descreve o teu perfil.
            </Text>
          </View>

          <View style={styles.typeCards}>
            {ACCOUNT_TYPES.map(t => {
              const selected = accountType === t.type;
              return (
                <Pressable
                  key={t.type}
                  onPress={() => setAccountType(t.type)}
                  style={[
                    styles.typeCard,
                    { backgroundColor: colors.card, borderColor: selected ? t.color : colors.border },
                    selected && { borderWidth: 2.5 },
                  ]}
                >
                  <View style={[styles.typeIconWrap, { backgroundColor: t.color + (selected ? '20' : '12') }]}>
                    <Ionicons name={t.icon} size={28} color={t.color} />
                  </View>
                  <View style={styles.typeText}>
                    <View style={styles.typeLabelRow}>
                      <Text style={[styles.typeLabel, { color: colors.textPrimary }]}>{t.label}</Text>
                      {(t.type === 'professional' || t.type === 'institution') && (
                        <View style={[styles.verifiedPill, { backgroundColor: t.color + '18' }]}>
                          <Ionicons name="shield-checkmark" size={11} color={t.color} />
                          <Text style={[styles.verifiedPillText, { color: t.color }]}>Badge verificado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>{t.description}</Text>
                  </View>
                  {selected && (
                    <View style={[styles.checkCircle, { backgroundColor: t.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {(accountType === 'professional' || accountType === 'institution') && (
            <View style={[styles.infoBanner, { backgroundColor: selectedType.color + '12', borderColor: selectedType.color + '30' }]}>
              <Ionicons name="information-circle" size={18} color={selectedType.color} />
              <Text style={[styles.infoText, { color: selectedType.color }]}>
                O teu perfil será analisado pela nossa equipa para atribuição do badge verificado.
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => setStep(2)}
            style={[styles.continueBtn, { backgroundColor: selectedType.color }]}
          >
            <Text style={styles.continueBtnText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Step 2: Fill in details ---
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setStep(1)} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>

        <View style={styles.stepHeader}>
          <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Passo 2 de 2</Text>
          <View style={styles.accountTypeBadge}>
            <View style={[styles.badgeIcon, { backgroundColor: selectedType.color }]}>
              <Ionicons name={selectedType.icon} size={16} color="#fff" />
            </View>
            <Text style={[styles.badgeLabel, { color: selectedType.color }]}>{selectedType.label}</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Os teus dados</Text>
        </View>

        {/* Base fields */}
        <View style={styles.form}>
          <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
            <Ionicons name="person" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder={accountType === 'institution' ? 'Nome da instituição' : 'Nome completo'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.textPrimary }]}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>

          <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
            <Ionicons name="mail" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.textPrimary }]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
            <Ionicons name="call" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Telemóvel (opcional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.textPrimary }]}
              keyboardType="phone-pad"
            />
          </View>

          <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
            <Ionicons name="lock-closed" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Palavra-passe"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              style={[styles.input, { color: colors.textPrimary }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />
            <Pressable onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
            <Ionicons name="lock-closed" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              ref={confirmPasswordRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmar palavra-passe"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirmPassword}
              style={[styles.input, { color: colors.textPrimary }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType={isProfOrInst ? 'next' : 'done'}
              onSubmitEditing={() => isProfOrInst ? specialtyRef.current?.focus() : handleRegister()}
            />
            <Pressable onPress={() => setShowConfirmPassword(s => !s)} style={styles.eyeBtn}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Extra fields for professional/institution */}
          {isProfOrInst && (
            <>
              <View style={[styles.sectionDivider, { borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  Informação profissional
                </Text>
              </View>

              <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
                <Ionicons name="briefcase" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  ref={specialtyRef}
                  value={specialty}
                  onChangeText={setSpecialty}
                  placeholder={accountType === 'professional' ? 'Especialidade (ex: Terapeuta ABA)' : 'Tipo de instituição (ex: Centro de Terapias)'}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.textPrimary }]}
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.inputRow, styles.inputRowMulti, { backgroundColor: colors.card }]}>
                <Ionicons name="document-text" size={20} color={colors.textSecondary} style={[styles.inputIcon, { marginTop: 14 }]} />
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Breve descrição (opcional)"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.inputMulti, { color: colors.textPrimary }]}
                  multiline
                  numberOfLines={3}
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
                <Ionicons name="globe" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="Website (opcional)"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.textPrimary }]}
                  autoCapitalize="none"
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>
            </>
          )}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: '#ef444415', borderColor: '#ef444430' }]}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={[styles.continueBtn, { backgroundColor: selectedType.color, opacity: loading ? 0.7 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={styles.continueBtnText}>Criar Conta</Text>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </>
            }
          </Pressable>

          <View style={styles.loginLink}>
            <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>Já tens conta? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLinkText, { color: selectedType.color, fontFamily: 'Poppins_700Bold' }]}>Entrar</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 8 },
  backBtn: { padding: 4, marginBottom: 8, alignSelf: 'flex-start' },
  stepHeader: { marginBottom: 28 },
  stepLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', letterSpacing: 0.5, marginBottom: 8 },
  title: { fontSize: 28, fontFamily: 'Poppins_700Bold', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 22 },
  accountTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badgeIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgeLabel: { fontSize: 14, fontFamily: 'Poppins_700Bold' },

  typeCards: { gap: 14, marginBottom: 20 },
  typeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 14 },
  typeIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  typeText: { flex: 1 },
  typeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  typeLabel: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  typeDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 18 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  verifiedPillText: { fontSize: 10, fontFamily: 'Poppins_700Bold' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 19 },

  form: { gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  inputRowMulti: { alignItems: 'flex-start' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', paddingVertical: 0 },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  eyeBtn: { padding: 4, marginLeft: 8 },

  sectionDivider: { borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  errorText: { flex: 1, color: '#ef4444', fontSize: 13, fontFamily: 'Poppins_500Medium' },

  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, marginTop: 8 },
  continueBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },

  loginLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  loginLinkText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
});