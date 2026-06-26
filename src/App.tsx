import React, { useEffect, useState } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingModal from './components/OnboardingModal';

SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = '@alba_onboarding_done';

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Poppins_400Regular,
          Poppins_500Medium,
          Poppins_600SemiBold,
          Poppins_700Bold,
        });
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!done) setShowOnboarding(true);
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  if (!appIsReady) {
    return null;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <AppNavigator />
            <OnboardingModal visible={showOnboarding} onDone={handleOnboardingDone} />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}