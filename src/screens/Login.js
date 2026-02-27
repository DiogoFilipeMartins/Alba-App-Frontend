import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ navigation }) {
  const { signIn, resetPassword } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);
  const [resendLoading, setResendLoading] = useState(false);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleLogin = useCallback(async () => {
    setError(null);
    if (!validateEmail(email)) {
      setError('Por favor, insira um email válido.');
      return;
    }
    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      navigation.replace('Map');
    } catch (e) {
      console.log('handleLogin exception', e);
      const errMsg = e?.message || 'Ocorreu um erro inesperado. Tenta novamente.';
      if (errMsg.toLowerCase().includes('email not confirmed')) {
        setError('Email não confirmado. Verifica o link de confirmação recebido no email.');
      } else if (errMsg.toLowerCase().includes('invalid')) {
        setError('Credenciais inválidas.');
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, navigation, signIn]);

  const handleResetPassword = useCallback(async () => {
    if (!validateEmail(email)) {
      Alert.alert('Escreve um email válido primeiro.');
      return;
    }
    try {
      setResendLoading(true);
      await resetPassword(email);
      Alert.alert('Email enviado', 'Verifica a tua caixa de entrada para repor a palavra-passe.');
    } catch (e) {
      console.log('reset exception', e);
      Alert.alert('Erro', 'Não foi possível enviar o email. Tenta novamente mais tarde.');
    } finally {
      setResendLoading(false);
    }
  }, [email, resetPassword]);

  return (
    <LinearGradient colors={['#111827', '#0f172a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={tw`flex-1 p-6 justify-center`}>
      <View style={tw`items-center mb-8`}>
        <LinearGradient colors={['#3b82f6', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={tw`w-16 h-16 rounded-full items-center justify-center mb-4`}>
          <Ionicons name="heart" size={32} color="white" />
        </LinearGradient>
        <Text style={tw`text-2xl font-bold text-white mb-1`}>Alba</Text>
        <Text style={tw`text-gray-300 text-base`}>Seu apoio digital sempre presente</Text>
      </View>

      <View style={tw`bg-gray-800/90 rounded-3xl p-6 shadow-lg border border-gray-700`}>
        <Text style={tw`text-xl font-bold text-white mb-4 text-center`}>Entrar</Text>

        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-300 text-sm font-medium mb-2`}>Email</Text>
          <View style={tw`flex-row items-center rounded-2xl border border-gray-600 bg-gray-700 px-4 py-3`}>
            <Ionicons name="person" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
            <TextInput value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor="#9CA3AF" style={tw`flex-1 text-white`} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} accessibilityLabel="Campo de email" />
          </View>
        </View>

        <View style={tw`mb-2`}>
          <Text style={tw`text-gray-300 text-sm font-medium mb-2`}>Palavra-passe</Text>
          <View style={tw`flex-row items-center rounded-2xl border border-gray-600 bg-gray-700 px-4 py-3`}>
            <Ionicons name="lock-closed" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
            <TextInput ref={passwordRef} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#9CA3AF" secureTextEntry={!showPassword} style={tw`flex-1 text-white`} autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleLogin} accessibilityLabel="Campo de palavra-passe" />
            <Pressable onPress={() => setShowPassword((s) => !s)} style={{ padding: 6, marginLeft: 8 }} accessibilityRole="button">
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>

        {error ? <Text style={tw`text-red-400 text-center mb-3 text-sm`}>{error}</Text> : null}

        <Pressable onPress={handleLogin} disabled={loading} style={[tw`rounded-2xl items-center mb-2`, loading && tw`opacity-70`]} accessibilityRole="button">
          <LinearGradient colors={['#2563eb', '#06b6d4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tw`w-full rounded-2xl py-3 items-center`}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white font-semibold`}>Entrar</Text>}
          </LinearGradient>
        </Pressable>

        {error && error.toLowerCase().includes('confirm') ? (
          <View style={tw`mt-2`}>
            <Pressable onPress={handleResetPassword} disabled={resendLoading} style={tw`items-center`}>
              <Text style={tw`text-yellow-300 underline`}>{resendLoading ? 'Enviando...' : 'Reenviar email de confirmação'}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={tw`mt-6 items-center gap-2`}>
        <View style={tw`flex-row`}>
          <Text style={tw`text-gray-400 mr-1`}>Não tem conta?</Text>
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <Text style={tw`text-cyan-400 underline`}>Criar conta</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}