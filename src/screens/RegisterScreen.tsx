import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable,
  ActivityIndicator, ScrollView, StyleSheet, Animated, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import CustomAlertModal from '../components/CustomAlertModal';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';

type Institution = { id: string; full_name: string; specialty: string | null; verified: boolean; city: string | null };
type ProfessionalKind = 'independent' | 'affiliated';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;
type AccountType = 'user' | 'professional' | 'institution';

const ACCOUNT_TYPES: { type: AccountType; icon: any; label: string; description: string; color: string }[] = [
  {
    type: 'user',
    icon: 'person',
    label: 'Padrão',
    description: 'Familiar, pessoa autista ou cuidador à procura de recursos e comunidade.',
    color: '#0369a1',
  },
  {
    type: 'professional',
    icon: 'medkit',
    label: 'Profissional',
    description: 'Terapeuta, psicólogo, médico ou outro profissional de saúde.',
    color: '#0ebd5f',
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

  const [successModal, setSuccessModal] = useState(false);

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

  // Professional-only: pertença a instituição
  const [professionalKind, setProfessionalKind] = useState<ProfessionalKind>('independent');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [institutionModal, setInstitutionModal] = useState(false);
  const [institutionSearch, setInstitutionSearch] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega instituições quando o profissional escolhe "pertenço a instituição".
  useEffect(() => {
    if (accountType === 'professional' && professionalKind === 'affiliated' && institutions.length === 0 && !institutionsLoading) {
      setInstitutionsLoading(true);
      apiService.getInstitutions()
        .then(list => setInstitutions(list || []))
        .catch(() => setInstitutions([]))
        .finally(() => setInstitutionsLoading(false));
    }
  }, [accountType, professionalKind]);

  const filteredInstitutions = institutions.filter(i =>
    i.full_name.toLowerCase().includes(institutionSearch.toLowerCase().trim())
  );

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
    if (accountType === 'professional' && professionalKind === 'affiliated' && !selectedInstitution) {
      setError('Seleciona a instituição a que pertences ou escolhe "Por conta própria".');
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
        professional_kind: accountType === 'professional' ? professionalKind : undefined,
        institution_id: accountType === 'professional' && professionalKind === 'affiliated' ? selectedInstitution?.id : undefined,
      });
      setSuccessModal(true);
    } catch (e: any) {
      setError(e?.message || 'Ocorreu um erro inesperado. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, phone, accountType, specialty, bio, website, professionalKind, selectedInstitution, navigation, signUp]);

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

          {/* Pertença a instituição — apenas para profissionais */}
          {accountType === 'professional' && (
            <>
              <View style={[styles.sectionDivider, { borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  Exerces onde?
                </Text>
              </View>

              <Pressable
                onPress={() => { setProfessionalKind('independent'); setSelectedInstitution(null); }}
                style={[styles.kindCard, { backgroundColor: colors.card, borderColor: professionalKind === 'independent' ? selectedType.color : colors.border, borderWidth: professionalKind === 'independent' ? 2 : 1 }]}
              >
                <Ionicons name="person-circle-outline" size={22} color={selectedType.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.kindTitle, { color: colors.textPrimary }]}>Por conta própria</Text>
                  <Text style={[styles.kindDesc, { color: colors.textSecondary }]}>Defines a tua localização no perfil depois de entrares (opcional).</Text>
                </View>
                {professionalKind === 'independent' && <Ionicons name="checkmark-circle" size={20} color={selectedType.color} />}
              </Pressable>

              <Pressable
                onPress={() => setProfessionalKind('affiliated')}
                style={[styles.kindCard, { backgroundColor: colors.card, borderColor: professionalKind === 'affiliated' ? selectedType.color : colors.border, borderWidth: professionalKind === 'affiliated' ? 2 : 1 }]}
              >
                <Ionicons name="business-outline" size={22} color={selectedType.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.kindTitle, { color: colors.textPrimary }]}>Pertenço a uma instituição</Text>
                  <Text style={[styles.kindDesc, { color: colors.textSecondary }]}>Envia um pedido de associação. A instituição tem de o aceitar.</Text>
                </View>
                {professionalKind === 'affiliated' && <Ionicons name="checkmark-circle" size={20} color={selectedType.color} />}
              </Pressable>

              {professionalKind === 'affiliated' && (
                <Pressable
                  onPress={() => setInstitutionModal(true)}
                  style={[styles.inputRow, { backgroundColor: colors.card }]}
                >
                  <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.input, { color: selectedInstitution ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                    {selectedInstitution ? selectedInstitution.full_name : 'Selecionar instituição'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              )}
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
      <CustomAlertModal
        visible={successModal}
        title="Conta Criada!"
        message={accountType === 'user'
          ? "A tua conta foi criada com sucesso. Verifica o teu email para confirmar o registo."
          : accountType === 'professional' && professionalKind === 'affiliated'
            ? "Conta criada e a aguardar aprovação da nossa equipa. O pedido de associação à instituição foi registado — será enviado assim que confirmares o email e entrares. Verifica o teu email."
            : "A tua conta foi criada com sucesso e está a aguardar aprovação pela nossa equipa. Por favor, verifica o teu email para confirmar o registo."}
        icon="checkmark-circle-outline"
        iconColor={selectedType.color}
        primaryButton={{
          text: "OK",
          onPress: () => {
            setSuccessModal(false);
            const state = navigation.getState();
            if (state?.routeNames?.includes('Login')) {
              navigation.navigate('Login');
            }
          }
        }}
        onClose={() => setSuccessModal(false)}
      />

      {/* Modal de seleção de instituição */}
      <Modal visible={institutionModal} animationType="slide" transparent onRequestClose={() => setInstitutionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Escolher instituição</Text>
              <Pressable onPress={() => setInstitutionModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.inputRow, { backgroundColor: colors.card, marginBottom: 12 }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={institutionSearch}
                onChangeText={setInstitutionSearch}
                placeholder="Procurar por nome..."
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.textPrimary }]}
                autoFocus
              />
            </View>

            {institutionsLoading ? (
              <ActivityIndicator color={selectedType.color} style={{ marginTop: 24 }} />
            ) : (
              <FlatList
                data={filteredInstitutions}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={[styles.modalEmpty, { color: colors.textMuted }]}>
                    {institutions.length === 0 ? 'Ainda não há instituições registadas.' : 'Nenhuma instituição encontrada.'}
                  </Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { setSelectedInstitution(item); setInstitutionModal(false); setInstitutionSearch(''); }}
                    style={[styles.instRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.instIcon, { backgroundColor: selectedType.color + '18' }]}>
                      <Ionicons name="business" size={18} color={selectedType.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.instNameRow}>
                        <Text style={[styles.instName, { color: colors.textPrimary }]} numberOfLines={1}>{item.full_name}</Text>
                        {item.verified && <Ionicons name="shield-checkmark" size={13} color="#22c55e" />}
                      </View>
                      <Text style={[styles.instMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {[item.specialty, item.city].filter(Boolean).join(' · ') || 'Instituição'}
                      </Text>
                    </View>
                    {selectedInstitution?.id === item.id && <Ionicons name="checkmark-circle" size={20} color={selectedType.color} />}
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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

  kindCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  kindTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  kindDesc: { fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 17, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  modalClose: { padding: 4 },
  modalEmpty: { textAlign: 'center', marginTop: 32, fontSize: 14, fontFamily: 'Poppins_400Regular' },
  instRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  instIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  instNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  instName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', flexShrink: 1 },
  instMeta: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 1 },
});