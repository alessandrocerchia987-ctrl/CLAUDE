import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EmployeeTabs from './EmployeeTabs';
import EmployerTabs from './EmployerTabs';
import JobDetailScreen from '../screens/employee/JobDetailScreen';
import MyApplicationsScreen from '../screens/employee/MyApplicationsScreen';
import CandidateDetailScreen from '../screens/employer/CandidateDetailScreen';
import EmployerJobDetailScreen from '../screens/employer/EmployerJobDetailScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import SupportScreen from '../screens/shared/SupportScreen';
import StoryViewerScreen from '../screens/shared/StoryViewerScreen';
import AddStoryScreen from '../screens/shared/AddStoryScreen';
import { useAuth } from '../context/AuthContext';
import { StoriesProvider } from '../context/StoriesContext';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  const { user } = useAuth();
  const isEmployee = user.accountType === 'employee';

  return (
    <StoriesProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={isEmployee ? EmployeeTabs : EmployerTabs} />
        {isEmployee ? (
          <>
            <Stack.Screen name="JobDetail" component={JobDetailScreen} />
            <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="CandidateDetail" component={CandidateDetailScreen} />
            <Stack.Screen name="EmployerJobDetail" component={EmployerJobDetailScreen} />
          </>
        )}
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="AddStory" component={AddStoryScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </StoriesProvider>
  );
}
