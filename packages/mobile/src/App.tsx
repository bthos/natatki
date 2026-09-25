/**
 * Main App component
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NotesListScreen from './screens/NotesListScreen';
import NoteEditScreen from './screens/NoteEditScreen';
import RepositoriesScreen from './screens/RepositoriesScreen';

const Stack = createNativeStackNavigator();

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="NotesList"
            component={NotesListScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="NoteEdit"
            component={NoteEditScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Repositories"
            component={RepositoriesScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;

