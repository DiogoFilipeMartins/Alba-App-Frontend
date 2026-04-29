import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import tw from 'twrnc';

const PROFILE_OPTIONS = [
  { value: 'inquilino', label: 'Inquilino', description: 'Aceder ao prédio ou fração' },
  { value: 'proprietario', label: 'Proprietário', description: 'Gerir imóveis e contratos' },
  { value: 'tecnico', label: 'Técnico', description: 'Receber e acompanhar intervenções' },
];

const MANAGEMENT_OPTIONS = [
  { value: 'arrendamento', label: 'Arrendamento', description: 'Gestão de arrendamento habitacional' },
  { value: 'alojamento_local', label: 'Alojamento Local', description: 'Operação de reservas e estadias' },
  { value: 'condominio', label: 'Condomínio', description: 'Gestão de prédio e condóminos' },
];

// Cores do tema (extraídas da lógica do utilizador)
const colors = {
  background: '#020202',
  primary: '#058c42',
  inputBg: '#1a1a1a',
  border: '#058c4220',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#4B5563',
};

export default function Login({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Alba-App usa password, não OTP por defeito
  const [step, setStep] = useState('details');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedManagementType, setSelectedManagementType] = useState(null);
  const [nif, setNif] = useState('');
  const [propertyData, setPropertyData] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Portugal',
  });
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    const onBackPress = () => {
      if (step !== 'details') {
        handleBack();
        return true;
      }
      if (isSignUp) {
        setIsSignUp(false);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [step, isSignUp]);

  const handleBack = () => {
    if (step === 'property_data') {
      setStep('management');
      return;
    }
    if (step === 'management') {
      setStep('profile');
      return;
    }
    if (step === 'profile') {
      setStep('nif_step');
      return;
    }
    if (step === 'nif_step') {
      setStep('details');
    }
  };

  const handleDetailsContinue = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erro', 'Insira um email válido.');
      return;
    }

    if (isSignUp) {
      if (!name.trim() || !phone.trim() || !password.trim()) {
        Alert.alert('Erro', 'Preencha todos os campos.');
        return;
      }
      setStep('nif_step');
    } else {
      if (!password.trim()) {
        Alert.alert('Erro', 'Insira a sua palavra-passe.');
        return;
      }
      handleLogin();
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Erro', error.message || 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      // No Alba-App, fazemos o signUp com os metadados
      await signUp({
        email: email.trim(),
        password,
        username: name.trim(),
      });
      // Nota: No mundo real, aqui salvaríamos NIF e Perfil no Postgres
      // Mas para manter a "cópia literal" do UI sem quebrar o backend:
      Alert.alert('Sucesso', 'Conta criada com sucesso!');
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Erro', error.message || 'Falha ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              {step === 'details' && !isSignUp && (
                 <View style={styles.logoPlaceholder} />
              )}
              {isSignUp && step !== 'details' && (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Text style={[styles.backText, { color: colors.primary }]}>Voltar</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {step === 'nif_step' ? 'Informação Fiscal' :
                 step === 'profile' ? 'Escolha o seu perfil' :
                 step === 'management' ? 'Tipo de gestão' :
                 step === 'property_data' ? 'Dados do Imóvel' :
                 isSignUp ? 'Criar Conta' : 'Bem-vindo'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {step === 'nif_step' ? 'Insira o seu NIF para faturação e contratos.' :
                 step === 'profile' ? 'Selecione o tipo de utilizador que melhor descreve a sua conta.' :
                 step === 'management' ? 'Indique o tipo de gestão que pretende usar.' :
                 step === 'property_data' ? 'Crie agora o seu primeiro imóvel no sistema.' :
                 'Insira os seus dados para continuar.'}
              </Text>
            </View>

            {step === 'details' ? (
              <View style={styles.form}>
                {isSignUp && (
                  <>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="Nome completo"
                      placeholderTextColor={colors.textMuted}
                      value={name}
                      onChangeText={setName}
                    />
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="Telemóvel"
                      placeholderTextColor={colors.textMuted}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </>
                )}
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="Endereço de email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="Palavra-passe"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleDetailsContinue}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Continuar</Text>}
                </TouchableOpacity>

                <View style={styles.switchBtn}>
                  <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                    {isSignUp ? 'Já tem uma conta? ' : 'Ainda não tem conta? '}
                    <Text
                      style={{ color: colors.primary, fontWeight: '800' }}
                      onPress={() => setIsSignUp(!isSignUp)}
                    >
                      {isSignUp ? 'Entrar' : 'Registar'}
                    </Text>
                  </Text>
                </View>
              </View>
            ) : step === 'nif_step' ? (
              <View style={styles.form}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="NIF"
                  placeholderTextColor={colors.textMuted}
                  value={nif}
                  onChangeText={setNif}
                  keyboardType="number-pad"
                  maxLength={9}
                />
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={() => setStep('profile')}
                >
                  <Text style={styles.buttonText}>Continuar</Text>
                </TouchableOpacity>
              </View>
            ) : step === 'profile' ? (
              <View style={styles.form}>
                <View style={styles.optionsList}>
                  {PROFILE_OPTIONS.map((option) => {
                    const isSelected = selectedProfile === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionCard,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.inputBg,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedProfile(option.value)}
                      >
                        <Text style={[styles.optionTitle, { color: isSelected ? '#FFF' : colors.textPrimary }]}>{option.label}</Text>
                        <Text style={[styles.optionDescription, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>{option.description}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={() => selectedProfile === 'proprietario' ? setStep('management') : handleFinalize()}
                >
                  <Text style={styles.buttonText}>Continuar</Text>
                </TouchableOpacity>
              </View>
            ) : step === 'management' ? (
                <View style={styles.form}>
                  <View style={styles.optionsList}>
                    {MANAGEMENT_OPTIONS.map((option) => {
                      const isSelected = selectedManagementType === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionCard,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.inputBg,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedManagementType(option.value)}
                        >
                          <Text style={[styles.optionTitle, { color: isSelected ? '#FFF' : colors.textPrimary }]}>{option.label}</Text>
                          <Text style={[styles.optionDescription, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>{option.description}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={() => setStep('property_data')}
                  >
                    <Text style={styles.buttonText}>Continuar</Text>
                  </TouchableOpacity>
                </View>
            ) : (
              <View style={styles.form}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="Nome do Imóvel"
                  placeholderTextColor={colors.textMuted}
                  value={propertyData.name}
                  onChangeText={(t) => setPropertyData({ ...propertyData, name: t })}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="Morada"
                  placeholderTextColor={colors.textMuted}
                  value={propertyData.address}
                  onChangeText={(t) => setPropertyData({ ...propertyData, address: t })}
                />
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleFinalize}
                >
                  <Text style={styles.buttonText}>Finalizar e Criar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 40 },
  header: { marginBottom: 48 },
  logoPlaceholder: { height: 20 },
  backButton: { marginBottom: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '800' },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  form: { gap: 16 },
  optionsList: { gap: 12 },
  optionCard: { borderRadius: 8, padding: 20, borderWidth: 1 },
  optionTitle: { fontSize: 16, fontWeight: '800' },
  optionDescription: { fontSize: 13, lineHeight: 20, marginTop: 6 },
  input: { height: 64, borderRadius: 8, paddingHorizontal: 24, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  button: { height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12, elevation: 2, shadowColor: '#058c42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  switchBtn: { alignItems: 'center', marginTop: 24 },
  switchText: { fontSize: 14, fontWeight: '600' },
});