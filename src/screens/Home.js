import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';

export default function Home({ navigation }) {
  const { signOut } = useAuth();
  const handleLogout = async () => {
    try {
      await signOut();
      navigation.replace('Login');
    } catch (e) {
      console.error('Erro ao fazer logout:', e);
    }
  };

  return (
    <LinearGradient 
      colors={['#111827', '#0f172a']} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }} 
      style={tw`flex-1 p-6 justify-center items-center`}
    >
      <View style={tw`items-center gap-4`}>
        <LinearGradient 
          colors={['#3b82f6', '#22d3ee']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={tw`w-20 h-20 rounded-full items-center justify-center mb-4`}
        >
          <Ionicons name="checkmark-circle" size={40} color="white" />
        </LinearGradient>
        <Text style={tw`text-3xl font-bold text-white text-center`}>Bem-vindo ao CarePlus! 🎉</Text>
        <Text style={tw`text-gray-300 text-center`}>Autenticação com backend local funcionando</Text>
        
        <Pressable 
          onPress={handleLogout}
          style={tw`mt-8`}
        >
          <LinearGradient 
            colors={['#ef4444', '#f87171']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 0 }} 
            style={tw`px-6 py-3 rounded-2xl`}
          >
            <Text style={tw`text-white font-semibold`}>Terminar Sessão</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </LinearGradient>
  );
}