import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Login from '../screens/LoginScreen';
import Register from '../screens/RegisterScreen';
import MapScreen from '../screens/MapScreen';
import SuggestPlaceScreen from '../screens/SuggestPlaceScreen';
import AdminScreen from '../screens/AdminScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { RootStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();



function MainTabs() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020202' }} edges={['bottom']}>
      <Tab.Navigator
        id={undefined}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#020202',
            borderTopColor: '#058c4220',
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: '#16db65',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarIcon: ({ color, size }) => {
            let iconName: any;
            if (route.name === 'Map') iconName = 'map';
            else if (route.name === 'SuggestPlace') iconName = 'add-circle';
            else if (route.name === 'Calendar') iconName = 'calendar';
            else if (route.name === 'Profile') iconName = 'person';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'Mapa' }} />
        <Tab.Screen name="SuggestPlace" component={SuggestPlaceScreen} options={{ tabBarLabel: 'Sugerir' }} />
        <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: 'Agenda' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#020202' },
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SignUp" component={Register} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="MapPicker" component={MapPickerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}