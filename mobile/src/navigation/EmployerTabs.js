import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import EmployerHomeScreen from '../screens/employer/EmployerHomeScreen';
import CandidateSearchScreen from '../screens/employer/CandidateSearchScreen';
import PostJobScreen from '../screens/employer/PostJobScreen';
import EmployerNotificationsScreen from '../screens/employer/EmployerNotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const ICONS = {
  EmployerHome: 'home',
  CandidateSearch: 'search',
  PostJob: 'add-circle',
  EmployerNotifications: 'notifications',
  Profile: 'person',
};

export default function EmployerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={`${ICONS[route.name]}${focused ? '' : '-outline'}`} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="EmployerHome" component={EmployerHomeScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="CandidateSearch" component={CandidateSearchScreen} options={{ tabBarLabel: 'Procurar' }} />
      <Tab.Screen name="PostJob" component={PostJobScreen} options={{ tabBarLabel: 'Publicar' }} />
      <Tab.Screen name="EmployerNotifications" component={EmployerNotificationsScreen} options={{ tabBarLabel: 'Notificações' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
