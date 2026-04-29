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
      await signUp({ email, password, username });
      Alert.alert('Conta criada', 'Verifica a tua caixa de entrada para confirmar o email antes de iniciar sessão.');
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
    <View style={tw`flex-1 bg-[#020202] p-8`}>
      <ScrollView contentContainerStyle={tw`justify-center min-h-full`} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw`items-center mb-8`}>
          <Text style={tw`text-3xl font-bold text-white mb-2`}>Registar</Text>
          <Text style={tw`text-[#16db65] text-lg`}>Crie sua conta e comece hoje</Text>
        </View>

        {/* Card com scroll interno */}
        <View style={tw`bg-transparent p-0 mb-8`}>


          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center rounded-2xl bg-[#1a1a1a] px-4 py-4`}>
              <Ionicons name="person" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput value={username} onChangeText={setUsername} placeholder="Nome de utilizador" placeholderTextColor="#4a4a4a" style={tw`flex-1 text-white text-lg`} autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} accessibilityLabel="Campo de nome de utilizador" />
            </View>
          </View>

          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center rounded-2xl bg-[#1a1a1a] px-4 py-4`}>
              <Ionicons name="mail" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput ref={emailRef} value={email} onChangeText={setEmail} placeholder="Endereço de email" placeholderTextColor="#4a4a4a" style={tw`flex-1 text-white text-lg`} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} accessibilityLabel="Campo de email" />
            </View>
          </View>

          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center rounded-2xl bg-[#1a1a1a] px-4 py-4`}>
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput ref={passwordRef} value={password} onChangeText={setPassword} placeholder="Palavra-passe" placeholderTextColor="#4a4a4a" secureTextEntry={!showPassword} style={tw`flex-1 text-white text-lg`} autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => confirmPasswordRef.current?.focus()} accessibilityLabel="Campo de palavra-passe" />
              <Pressable onPress={() => setShowPassword((s) => !s)} style={{ padding: 6, marginLeft: 8 }} accessibilityRole="button">
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          <View style={tw`mb-6`}>
            <View style={tw`flex-row items-center rounded-2xl bg-[#1a1a1a] px-4 py-4`}>
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput ref={confirmPasswordRef} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirmar palavra-passe" placeholderTextColor="#4a4a4a" secureTextEntry={!showConfirmPassword} style={tw`flex-1 text-white text-lg`} autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleRegister} accessibilityLabel="Campo de confirmação de palavra-passe" />
              <Pressable onPress={() => setShowConfirmPassword((s) => !s)} style={{ padding: 6, marginLeft: 8 }} accessibilityRole="button">
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {error ? <Text style={tw`text-red-400 text-center mb-3 text-sm mt-2`}>{error}</Text> : null}

          <Pressable onPress={handleRegister} disabled={loading} style={[tw`rounded-2xl items-center mb-6`, loading && tw`opacity-70`]} accessibilityRole="button">
            <View style={tw`w-full rounded-2xl py-4 items-center bg-[#058c42]`}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white text-lg font-bold`}>Continuar</Text>}
            </View>
          </Pressable>
        </View>

        {/* Footer Links */}
        <View style={tw`mt-6 items-center`}>
          <View style={tw`flex-row`}>
            <Text style={tw`text-white text-base font-bold`}>Já tem conta? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={tw`text-[#16db65] text-base font-bold`}>Entrar</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}