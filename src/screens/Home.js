import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { icon: 'map', label: 'Mapa', screen: 'Map', color: '#3b82f6' },
  { icon: 'calendar', label: 'Calendário', screen: 'Calendar', color: '#22c55e' },
  { icon: 'heart', label: 'Doações', screen: 'Donations', color: '#ef4444' },
  { icon: 'chatbubbles', label: 'Chatbot', screen: 'Chatbot', color: '#8b5cf6' },
  { icon: 'people', label: 'Comunidade', screen: 'Community', color: '#f59e0b' },
  { icon: 'star', label: 'Favoritos', screen: 'Favorites', color: '#ec4899' },
];

export default function Home({ navigation }) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.replace('Login');
    } catch (e) {
      console.error('Erro ao fazer logout:', e);
    }
  };

  const handleMenuPress = (screen) => {
    setMenuOpen(false);
    if (screen === 'Map') {
      navigation.navigate('Map');
    } else {
      // TODO: Navegar para os outros ecrãs quando implementados
      console.log(`Navegar para: ${screen}`);
    }
  };

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Utilizador';

  return (
    <LinearGradient
      colors={['#111827', '#0f172a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={tw`flex-1`}
    >
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-5 pt-12 pb-4`}>
        <Pressable onPress={() => setMenuOpen(true)} style={tw`p-2`}>
          <Ionicons name="menu" size={28} color="white" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-white`}>Alba</Text>
        <Pressable onPress={handleLogout} style={tw`p-2`}>
          <Ionicons name="log-out-outline" size={24} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView style={tw`flex-1 px-5`} showsVerticalScrollIndicator={false}>
        {/* User Welcome Card */}
        <LinearGradient
          colors={['#1e3a5f', '#0f172a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={tw`rounded-3xl p-6 mb-6 border border-gray-700`}
        >
          <View style={tw`flex-row items-center`}>
            <LinearGradient
              colors={['#3b82f6', '#22d3ee']}
              style={tw`w-16 h-16 rounded-full items-center justify-center mr-4`}
            >
              <Text style={tw`text-white text-2xl font-bold`}>
                {username.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={tw`flex-1`}>
              <Text style={tw`text-gray-400 text-sm`}>Bem-vindo de volta,</Text>
              <Text style={tw`text-white text-xl font-bold`}>{username}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions Grid */}
        <Text style={tw`text-white text-lg font-semibold mb-4`}>Acesso Rápido</Text>
        <View style={tw`flex-row flex-wrap justify-between`}>
          {menuItems.map((item) => (
            <Pressable
              key={item.screen}
              onPress={() => handleMenuPress(item.screen)}
              style={tw`w-[48%] mb-4`}
            >
              <LinearGradient
                colors={['#1f2937', '#111827']}
                style={tw`rounded-2xl p-5 border border-gray-700 items-center`}
              >
                <View style={[tw`w-12 h-12 rounded-full items-center justify-center mb-3`, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={tw`text-white font-medium text-center`}>{item.label}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* Status Card */}
        <View style={tw`bg-gray-800/50 rounded-2xl p-5 border border-gray-700 mb-6`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="information-circle" size={20} color="#22d3ee" />
            <Text style={tw`text-cyan-400 font-semibold ml-2`}>Estado da App</Text>
          </View>
          <Text style={tw`text-gray-400 text-sm leading-5`}>
            Funcionalidades em desenvolvimento: Mapa, Calendário, Doações e Chatbot.
            Em breve terás acesso a todas as ferramentas!
          </Text>
        </View>
      </ScrollView>

      {/* Sidebar Menu Modal */}
      <Modal
        visible={menuOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={tw`flex-1 flex-row`}
          onPress={() => setMenuOpen(false)}
        >
          <LinearGradient
            colors={['#1f2937', '#111827']}
            style={tw`w-72 h-full pt-12 px-5`}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Menu Header */}
              <View style={tw`flex-row items-center mb-8`}>
                <LinearGradient
                  colors={['#3b82f6', '#22d3ee']}
                  style={tw`w-12 h-12 rounded-full items-center justify-center mr-3`}
                >
                  <Text style={tw`text-white text-lg font-bold`}>
                    {username.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <View>
                  <Text style={tw`text-white font-bold`}>{username}</Text>
                  <Text style={tw`text-gray-400 text-xs`}>{user?.email}</Text>
                </View>
              </View>

              {/* Menu Items */}
              {menuItems.map((item) => (
                <Pressable
                  key={item.screen}
                  onPress={() => handleMenuPress(item.screen)}
                  style={tw`flex-row items-center py-4 border-b border-gray-700`}
                >
                  <View style={[tw`w-10 h-10 rounded-full items-center justify-center mr-4`, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={tw`text-white font-medium`}>{item.label}</Text>
                </Pressable>
              ))}

              {/* Logout */}
              <Pressable
                onPress={handleLogout}
                style={tw`flex-row items-center py-4 mt-4`}
              >
                <View style={tw`w-10 h-10 rounded-full items-center justify-center mr-4 bg-red-500/20`}>
                  <Ionicons name="log-out" size={20} color="#ef4444" />
                </View>
                <Text style={tw`text-red-400 font-medium`}>Terminar Sessão</Text>
              </Pressable>
            </Pressable>
          </LinearGradient>
          <View style={tw`flex-1 bg-black/50`} />
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}
