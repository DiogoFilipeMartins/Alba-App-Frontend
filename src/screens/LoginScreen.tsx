import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erro', 'Insira um email válido.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Erro', 'Insira a sua palavra-passe.');
      return;
    }

    if (isSignUp && (!name.trim() || !phone.trim())) {
      Alert.alert('Erro', 'Preencha o seu nome e telemóvel.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp({
          email: email.trim(),
          password,
          username: name.trim(),
        });
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
      } else {
        await signIn(email.trim(), password);
      }
      navigation.replace('Main');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
              <View style={styles.logoPlaceholder} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {isSignUp ? 'Criar Conta' : 'Bem-vindo'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {isSignUp ? 'Registe-se para começar a usar a Alba.' : 'Insira os seus dados para continuar.'}
              </Text>
            </View>

            <View style={styles.form}>
              {isSignUp && (
                <>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Nome completo"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Telemóvel"
                    placeholderTextColor={colors.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </>
              )}
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Endereço de email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Palavra-passe"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>{isSignUp ? 'Registar' : 'Entrar'}</Text>
                )}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 40 },
  header: { marginBottom: 48 },
  logoPlaceholder: { height: 20 },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  form: { gap: 16 },
  input: { height: 64, borderRadius: 8, paddingHorizontal: 24, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  button: { height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  switchBtn: { alignItems: 'center', marginTop: 24 },
  switchText: { fontSize: 14, fontWeight: '600' },
});