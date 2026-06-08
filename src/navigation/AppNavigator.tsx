import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

import Login from '../screens/LoginScreen';
import Register from '../screens/RegisterScreen';
import MapScreen from '../screens/MapScreen';
import SuggestPlaceScreen from '../screens/SuggestPlaceScreen';
import AdminScreen from '../screens/AdminScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import CalendarScreen from '../screens/CalendarScreen';
import DonationsScreen from '../screens/DonationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommunitiesScreen from '../screens/CommunitiesScreen';
import CommunityChatScreen from '../screens/CommunityChatScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import { RootStackParamList, MainTabParamList } from './types';

import { useTheme } from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();



function MainTabs() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Tab.Navigator
        id={undefined}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
            elevation: 0,
            shadowOpacity: 0,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: ({ color, size, focused }) => {
            let iconName: any;
            if (route.name === 'Map') iconName = 'map';
            else if (route.name === 'Chatbot') iconName = focused ? 'sparkles' : 'sparkles-outline';
            else if (route.name === 'Calendar') iconName = 'calendar';
            else if (route.name === 'Profile') iconName = 'person';
            else if (route.name === 'Communities') iconName = 'people';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'Mapa' }} />
        <Tab.Screen name="Chatbot" component={ChatbotScreen} options={{ tabBarLabel: 'Alba IA' }} />
        <Tab.Screen name="Communities" component={CommunitiesScreen} options={{ tabBarLabel: 'Comunidade' }} />
        <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: 'Agenda' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="SignUp" component={Register} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="SuggestPlace" component={SuggestPlaceScreen} />
            <Stack.Screen name="Donations" component={DonationsScreen} />
            <Stack.Screen name="MapPicker" component={MapPickerScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="CommunityChat" component={CommunityChatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}