import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const menuItems = [
  { icon: 'map', label: 'Mapa', screen: 'Map', color: '#16db65' },
  { icon: 'add-circle', label: 'Sugerir Local', screen: 'SuggestPlace', color: '#058c42' },
  { icon: 'calendar', label: 'Calendário', screen: 'Calendar', color: '#16db65' },
  { icon: 'heart', label: 'Doações', screen: 'Donations', color: '#058c42' },
  { icon: 'chatbubbles', label: 'Chatbot', screen: 'Chatbot', color: '#16db65' },
  { icon: 'people', label: 'Comunidade', screen: 'Community', color: '#058c42' },
  { icon: 'star', label: 'Favoritos', screen: 'Favorites', color: '#16db65' },
];

export default function Home({ navigation }) {
  const { user, signOut, isAdmin } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchPendingCount = async () => {
      try {
        const { count } = await apiService.getPendingPlacesCount();
        setPendingCount(count ?? 0);
      } catch (error) {
        console.error('Error fetching pending places count:', error);
      }
    };

    fetchPendingCount();

    // Optional: Set up a real-time subscription for pending places if needed
    // const subscription = supabase
    //   .from('places')
    //   .on('*', payload => {
    //     if (payload.new.status === 'pending' || payload.old.status === 'pending') {
    //       fetchPendingCount();
    //     }
    //   })
    //   .subscribe();

    // return () => {
    //   supabase.removeSubscription(subscription);
    // };

  }, [isAdmin]);

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
    if (screen === 'Map' || screen === 'SuggestPlace' || screen === 'Admin') {
      navigation.navigate(screen);
    } else {
      // TODO: Navegar para os outros ecrãs quando implementados
      console.log(`Navegar para: ${screen}`);
    }
  };

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Utilizador';

  return (
    <View style={tw`flex-1 bg-[#020202]`}>
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
        <View style={tw`rounded-3xl p-6 mb-6 border border-[#058c42]/30 bg-[#0d2818]`}>
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-16 h-16 rounded-full items-center justify-center mr-4`, { backgroundColor: '#058c42' }]}>
              <Text style={tw`text-white text-2xl font-bold`}>
                {username.charAt(0).toUpperCase()}
              </Text>
            </View>
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
              <View style={tw`rounded-2xl p-5 border border-[#058c42]/30 items-center bg-[#0d2818]`}>
                <View style={[tw`w-12 h-12 rounded-full items-center justify-center mb-3`, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={tw`text-white font-medium text-center`}>{item.label}</Text>
              </View>
            </Pressable>
          ))}
          {isAdmin && (
            <Pressable
              key="Admin"
              onPress={() => handleMenuPress('Admin')}
              style={tw`w-[48%] mb-4`}
            >
              <View style={tw`rounded-2xl p-5 border border-yellow-700/50 items-center bg-[#0d2818]`}>
                <View style={[tw`w-12 h-12 rounded-full items-center justify-center mb-3`, { backgroundColor: '#f59e0b20' }]}>
                  <Ionicons name="shield-checkmark" size={24} color="#f59e0b" />
                  {pendingCount > 0 && (
                    <View style={tw`absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center`}>
                      <Text style={tw`text-white text-xs font-bold`}>{pendingCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={tw`text-yellow-400 font-medium text-center`}>Painel Admin</Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Status Card */}
        <View style={tw`bg-[#0d2818]/50 rounded-2xl p-5 border border-[#058c42]/30 mb-6`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="information-circle" size={20} color="#16db65" />
            <Text style={tw`text-[#16db65] font-semibold ml-2`}>Estado da App</Text>
          </View>
          <Text style={tw`text-gray-400 text-sm leading-5`}>
            Funcionalidades em desenvolvimento: Calendário, Doações e Chatbot.
            Em breve terás acesso a todas as ferramentas!
          </Text>
        </View>

        {/* Admin Panel shortcut — only for admins */}
        {isAdmin && (
          <Pressable onPress={() => handleMenuPress('Admin')} style={tw`mb-6`}>
            <View style={[tw`rounded-2xl p-5 flex-row items-center`, { backgroundColor: '#058c42' }]}>
              <View style={tw`w-12 h-12 rounded-full bg-white/10 items-center justify-center mr-4`}>
                <Ionicons name="shield-checkmark" size={24} color="white" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-white font-bold text-base`}>Painel Admin</Text>
                <Text style={tw`text-purple-200 text-xs`}>Gerir sugestões de locais</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </Pressable>
        )}
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
          <View style={tw`w-72 h-full pt-12 px-5 bg-[#020202]`}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Menu Header */}
              <View style={tw`flex-row items-center mb-8`}>
                <View style={[tw`w-12 h-12 rounded-full items-center justify-center mr-3`, { backgroundColor: '#058c42' }]}>
                  <Text style={tw`text-white text-lg font-bold`}>
                    {username.charAt(0).toUpperCase()}
                  </Text>
                </View>
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
                  style={tw`flex-row items-center py-4 border-b border-[#058c42]/20`}
                >
                  <View style={[tw`w-10 h-10 rounded-full items-center justify-center mr-4`, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={tw`text-white font-medium`}>{item.label}</Text>
                </Pressable>
              ))}
              {isAdmin && (
                <Pressable
                  onPress={() => handleMenuPress('Admin')}
                  style={tw`flex-row items-center py-4 border-b border-[#058c42]/20`}
                >
                  <View style={tw`w-10 h-10 rounded-full items-center justify-center mr-4 bg-yellow-500/20`}>
                    <Ionicons name="shield-checkmark" size={20} color="#f59e0b" />
                  </View>
                  <Text style={tw`text-yellow-400 font-medium flex-1`}>Painel Admin</Text>
                  {pendingCount > 0 && (
                    <View style={tw`bg-red-500 rounded-full px-2 py-0.5`}>
                      <Text style={tw`text-white text-xs font-bold`}>{pendingCount}</Text>
                    </View>
                  )}
                </Pressable>
              )}

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
          </View>
          <View style={tw`flex-1 bg-black/50`} />
        </Pressable>
      </Modal>
    </View>
  );
}
