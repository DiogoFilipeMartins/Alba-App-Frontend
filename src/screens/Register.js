import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

export default function Register({ navigation }) {
  const { signUp } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

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
      const res = await signUp({ email, password, username });
      console.log('signUp res', res);

      if (res?.error) {
        setError(res.error.message || 'Erro ao criar conta.');
        return;
      }

      // Backend envia email de confirmação — informa o utilizador
      Alert.alert('Conta criada', 'Verifica a tua caixa de entrada para confirmar o email antes de iniciar sessão.');
      if (res?.previewUrl) {
        Alert.alert('Ethereal Preview', `Link de preview do email: ${res.previewUrl}`);
      }
      navigation.replace('Login');
    } catch (e) {
      console.log('handleRegister exception', e);
      const errMsg = e?.message || 'Ocorreu um erro inesperado. Tenta novamente.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, navigation, signUp]);

  return (
    <LinearGradient colors={['#111827', '#0f172a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={tw`flex-1 p-6`}>
      <ScrollView contentContainerStyle={tw`justify-center min-h-full`} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw`items-center mb-8`}>
          <LinearGradient colors={['#3b82f6', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={tw`w-16 h-16 rounded-full items-center justify-center mb-4`}>
            <Ionicons name="heart" size={32} color="white" />
          </LinearGradient>
          <Text style={tw`text-2xl font-bold text-white mb-1`}>Alba</Text>
          <Text style={tw`text-gray-300 text-base`}>Crie sua conta e comece hoje</Text>
        </View>

        {/* Card com scroll interno */}
        <View style={tw`bg-gray-800/90 rounded-3xl p-6 shadow-lg border border-gray-700`}>
          <Text style={tw`text-xl font-bold text-white mb-4 text-center`}>Criar Conta</Text>

          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-300 text-sm font-medium mb-2`}>Nome de Utilizador</Text>
            <View style={tw`flex-row items-center rounded-2xl border border-gray-600 bg-gray-700 px-4 py-3`}>
              <Ionicons name="person" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput value={username} onChangeText={setUsername} placeholder="seu_utilizador" placeholderTextColor="#9CA3AF" style={tw`flex-1 text-white`} autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} accessibilityLabel="Campo de nome de utilizador" />
            </View>
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-300 text-sm font-medium mb-2`}>Email</Text>
            <View style={tw`flex-row items-center rounded-2xl border border-gray-600 bg-gray-700 px-4 py-3`}>
              <Ionicons name="mail" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput ref={emailRef} value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor="#9CA3AF" style={tw`flex-1 text-white`} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} accessibilityLabel="Campo de email" />
            </View>
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-300 text-sm font-medium mb-2`}>Palavra-passe</Text>
            <View style={tw`flex-row items-center rounded-2xl border border-gray-600 bg-gray-700 px-4 py-3`}>
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput ref={passwordRef} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#9CA3AF" secureTextEntry={!showPassword} style={tw`flex-1 text-white`} autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => confirmPasswordRef.current?.focus()} accessibilityLabel="Campo de palavra-passe" />
              <Pressable onPress={() => setShowPassword((s) => !s)} style={{ padding: 6, marginLeft: 8 }} accessibilityRole="button">
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          <View style={tw`mb-2`}>
            <Text style={tw`text-gray-300 text-sm font-medium mb-2`}>Confirmar Palavra-passe</Text>
            <View style={tw`flex-row items-center rounded-2xl border border-gray-600 bg-gray-700 px-4 py-3`}>
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput ref={confirmPasswordRef} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" placeholderTextColor="#9CA3AF" secureTextEntry={!showConfirmPassword} style={tw`flex-1 text-white`} autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleRegister} accessibilityLabel="Campo de confirmação de palavra-passe" />
              <Pressable onPress={() => setShowConfirmPassword((s) => !s)} style={{ padding: 6, marginLeft: 8 }} accessibilityRole="button">
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {error ? <Text style={tw`text-red-400 text-center mb-3 text-sm mt-2`}>{error}</Text> : null}

          <Pressable onPress={handleRegister} disabled={loading} style={[tw`rounded-2xl items-center mt-2`, loading && tw`opacity-70`]} accessibilityRole="button">
            <LinearGradient colors={['#2563eb', '#06b6d4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tw`w-full rounded-2xl py-3 items-center`}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white font-semibold`}>Criar Conta</Text>}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Footer Links */}
        <View style={tw`mt-6 items-center`}>
          <View style={tw`flex-row`}>
            <Text style={tw`text-gray-400 mr-1`}>Já tem conta?</Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={tw`text-cyan-400 underline`}>Entrar</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}