import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  Image,
  Modal,
} from 'react-native';
import CustomAlertModal from '../components/CustomAlertModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/apiService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();

  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    primaryButton?: { text: string; onPress: () => void; destructive?: boolean };
    secondaryButton?: { text: string; onPress: () => void };
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (
    title: string,
    message: string,
    icon?: keyof typeof Ionicons.glyphMap,
    iconColor?: string,
    primaryButton?: { text: string; onPress: () => void; destructive?: boolean },
    secondaryButton?: { text: string; onPress: () => void }
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      icon,
      iconColor,
      primaryButton,
      secondaryButton,
    });
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      showAlert('Email inválido', 'Insere um endereço de email válido.', 'alert-circle-outline', '#ef4444');
      return;
    }
    setSendingReset(true);
    try {
      await apiService.forgotPassword(forgotEmail.trim());
      setForgotModalVisible(false);
      setForgotEmail('');
      showAlert('Email enviado', 'Se esse email existir na nossa plataforma, receberás um link para redefinir a tua palavra-passe.', 'checkmark-circle-outline', '#22c55e');
    } catch (e: any) {
      showAlert('Erro', e.message || 'Não foi possível enviar o email.', 'alert-circle-outline', '#ef4444');
    } finally {
      setSendingReset(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !email.includes('@')) {
      showAlert('Erro', 'Insira um email válido.', 'alert-circle-outline', '#ef4444');
      return;
    }
    if (!password.trim()) {
      showAlert('Erro', 'Insira a sua palavra-passe.', 'alert-circle-outline', '#ef4444');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha na autenticação.', 'alert-circle-outline', '#ef4444');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/AlbaAppLogoSemFundo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={[styles.logoText, { color: colors.textPrimary, fontFamily: colors.fontBold }]}>Alba</Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary, fontFamily: colors.fontBold }]}>
                Bem-vindo
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: colors.fontRegular }]}>
                Insira os seus dados para continuar.
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border, fontFamily: colors.fontRegular }]}
                placeholder="Endereço de email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border, fontFamily: colors.fontRegular }]}
                  placeholder="Palavra-passe"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  keyboardType={!showPassword && Platform.OS === 'android' ? 'visible-password' : 'default'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  importantForAutofill="noExcludeDescendants"
                  textContentType="none"
                  contextMenuHidden={true}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={24} 
                    color={colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.buttonText, { fontFamily: colors.fontBold }]}>Entrar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotBtn} onPress={() => { setForgotEmail(''); setForgotModalVisible(true); }}>
                <Text style={[styles.forgotText, { color: colors.primary, fontFamily: colors.fontRegular }]}>
                  Esqueceu-se da palavra-passe?
                </Text>
              </TouchableOpacity>

              <View style={styles.switchBtn}>
                <Text style={[styles.switchText, { color: colors.textSecondary, fontFamily: colors.fontRegular }]}>
                  Ainda não tem conta?{' '}
                  <Text
                    style={{ color: colors.primary, fontFamily: colors.fontBold }}
                    onPress={() => navigation.navigate('SignUp')}
                  >
                    Registar
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        primaryButton={alertConfig.primaryButton}
        secondaryButton={alertConfig.secondaryButton}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      {/* Forgot Password Modal */}
      <Modal visible={forgotModalVisible} transparent animationType="fade" onRequestClose={() => setForgotModalVisible(false)}>
        <View style={styles.forgotOverlay}>
          <View style={[styles.forgotCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-open-outline" size={36} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.forgotTitle, { color: colors.textPrimary, fontFamily: colors.fontBold }]}>Recuperar Palavra-passe</Text>
            <Text style={[styles.forgotSub, { color: colors.textSecondary, fontFamily: colors.fontRegular }]}>
              Insere o teu email e enviamos um link para redefinires a tua palavra-passe.
            </Text>
            <TextInput
              style={[styles.forgotInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border, fontFamily: colors.fontRegular }]}
              placeholder="O teu email"
              placeholderTextColor={colors.textMuted}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.forgotActionBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setForgotModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontFamily: colors.fontBold, fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.forgotActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleForgotPassword}
                disabled={sendingReset}
              >
                {sendingReset ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontFamily: colors.fontBold, fontSize: 14 }}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 60 },
  content: { paddingHorizontal: 40, paddingBottom: 60 },
  header: { marginBottom: 40 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 12 },
  logoImage: { width: 52, height: 52, borderRadius: 14 },
  logoText: { fontSize: 30, letterSpacing: -1 },
  title: { fontSize: 32, marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  form: { gap: 16 },
  input: { height: 64, borderRadius: 8, paddingHorizontal: 24, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  passwordContainer: { position: 'relative', width: '100%' },
  passwordInput: { paddingRight: 60 },
  eyeIcon: { position: 'absolute', right: 20, top: 20, height: 24, justifyContent: 'center' },
  button: { height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  buttonText: { color: '#FFF', fontSize: 16 },
  switchBtn: { alignItems: 'center', marginTop: 24 },
  switchText: { fontSize: 14 },
  forgotBtn: { alignItems: 'center', marginTop: 4 },
  forgotText: { fontSize: 13 },
  forgotOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  forgotCard: { width: '100%', maxWidth: 340, borderRadius: 24, borderWidth: 1, padding: 24, gap: 10 },
  forgotTitle: { fontSize: 18, textAlign: 'center' },
  forgotSub: { fontSize: 13, textAlign: 'center', lineHeight: 18, opacity: 0.8 },
  forgotInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginTop: 4 },
  forgotActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});