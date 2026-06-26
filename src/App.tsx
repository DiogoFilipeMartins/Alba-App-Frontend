import React, { useEffect, useState, useRef } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

function AppContent() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const checkedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setShowOnboarding(false);
      checkedUserId.current = null;
      return;
    }
    if (checkedUserId.current === user.id) return;
    checkedUserId.current = user.id;

    AsyncStorage.getItem(`@alba_onboarding_done_${user.id}`).then(done => {
      if (!done) setShowOnboarding(true);
    });
  }, [user, loading]);

  const handleOnboardingDone = async () => {
    if (user) {
      await AsyncStorage.setItem(`@alba_onboarding_done_${user.id}`, 'true');
    }
    setShowOnboarding(false);
  };

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
      <OnboardingModal visible={showOnboarding} onDone={handleOnboardingDone} />
    </>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Poppins_400Regular,
          Poppins_500Medium,
          Poppins_600SemiBold,
          Poppins_700Bold,
        });
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
