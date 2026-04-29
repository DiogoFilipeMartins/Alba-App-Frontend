import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from '../screens/LoginScreen';
import Register from '../screens/RegisterScreen';
import MapScreen from '../screens/MapScreen';
import SuggestPlaceScreen from '../screens/SuggestPlaceScreen';
import AdminScreen from '../screens/AdminScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HomeScreen from '../screens/HomeScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#020202' },
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SignUp" component={Register} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="SuggestPlace" component={SuggestPlaceScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="MapPicker" component={MapPickerScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}