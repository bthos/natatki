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
  // #region agent log
  try {
    fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:15',message:'App component rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  } catch(e) {}
  // #endregion
  
  try {
    return (
      <SafeAreaProvider>
        {/* #region agent log */}
        {(() => { try { fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:18',message:'SafeAreaProvider rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{}); } catch(e) {} return null; })()}
        {/* #endregion */}
        <NavigationContainer>
          {/* #region agent log */}
          {(() => { try { fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:19',message:'NavigationContainer rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{}); } catch(e) {} return null; })()}
          {/* #endregion */}
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
  } catch (error) {
    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:40',message:'App render error',data:{error:error?.toString(),stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    } catch(e) {}
    // #endregion
    throw error;
  }
};

export default App;

