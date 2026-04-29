import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { colors, isDark } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleRegister = useCallback(async () => {
    setError(null);
    if (username.length < 3) {
      setError('O nome de utilizador deve ter pelo menos 3 caracteres.');
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
      await signUp({ email, password, username });
      Alert.alert('Conta criada', 'Verifica a tua caixa de entrada para confirmar o email antes de iniciar sessão.');
      navigation.replace('Login');
    } catch (e: any) {
      console.log('handleRegister exception', e);
      const errMsg = e?.message || 'Ocorreu um erro inesperado. Tenta novamente.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, navigation, signUp]);


  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={tw`flex-1 p-8`}>
      <ScrollView contentContainerStyle={tw`justify-center min-h-full`} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw`items-center mb-8`}>
          <Text style={[tw`text-3xl font-bold mb-2`, { color: colors.textPrimary }]}>Registar</Text>
          <Text style={[tw`text-lg`, { color: colors.accent }]}>Crie sua conta e comece hoje</Text>
        </View>

        {/* Form */}
        <View style={tw`bg-transparent p-0 mb-8`}>
          <View style={tw`mb-4`}>
            <View style={[tw`flex-row items-center rounded-2xl px-4 py-4`, { backgroundColor: colors.card }]}>
              <Ionicons name="person" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
              <TextInput value={username} onChangeText={setUsername} placeholder="Nome de utilizador" placeholderTextColor={colors.textMuted} style={[tw`flex-1 text-lg`, { color: colors.textPrimary }]} autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
            </View>
          </View>

          <View style={tw`mb-4`}>
            <View style={[tw`flex-row items-center rounded-2xl px-4 py-4`, { backgroundColor: colors.card }]}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
              <TextInput ref={emailRef} value={email} onChangeText={setEmail} placeholder="Endereço de email" placeholderTextColor={colors.textMuted} style={[tw`flex-1 text-lg`, { color: colors.textPrimary }]} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
            </View>
          </View>

          <View style={tw`mb-4`}>
            <View style={[tw`flex-row items-center rounded-2xl px-4 py-4`, { backgroundColor: colors.card }]}>
              <Ionicons name="lock-closed" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
              <TextInput ref={passwordRef} value={password} onChangeText={setPassword} placeholder="Palavra-passe" placeholderTextColor={colors.textMuted} secureTextEntry={!showPassword} style={[tw`flex-1 text-lg`, { color: colors.textPrimary }]} autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => confirmPasswordRef.current?.focus()} />
              <Pressable onPress={() => setShowPassword((s) => !s)} style={{ padding: 6, marginLeft: 8 }}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={tw`mb-6`}>
            <View style={[tw`flex-row items-center rounded-2xl px-4 py-4`, { backgroundColor: colors.card }]}>
              <Ionicons name="lock-closed" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
              <TextInput ref={confirmPasswordRef} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirmar palavra-passe" placeholderTextColor={colors.textMuted} secureTextEntry={!showConfirmPassword} style={[tw`flex-1 text-lg`, { color: colors.textPrimary }]} autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleRegister} />
              <Pressable onPress={() => setShowConfirmPassword((s) => !s)} style={{ padding: 6, marginLeft: 8 }}>
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {error ? <Text style={tw`text-red-400 text-center mb-3 text-sm mt-2`}>{error}</Text> : null}

          <Pressable onPress={handleRegister} disabled={loading} style={[tw`rounded-2xl items-center mb-6`, loading && tw`opacity-70`]}>
            <View style={[tw`w-full rounded-2xl py-4 items-center`, { backgroundColor: colors.accent }]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white text-lg font-bold`}>Continuar</Text>}
            </View>
          </Pressable>
        </View>

        {/* Footer Links */}
        <View style={tw`mt-6 items-center`}>
          <View style={tw`flex-row`}>
            <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>Já tem conta? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={[tw`text-base font-bold`, { color: colors.accent }]}>Entrar</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}