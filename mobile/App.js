import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

// Every icon in the app is an Ionicons glyph. Android (unlike iOS) needs the
// icon font explicitly loaded and ready before the first render, or icons
// silently render blank while everything around them still works — buttons
// are there and tappable, just invisible. Gate rendering on this instead.
export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
