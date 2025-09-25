import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ParentHome from "./src/screens/ParentHome";
import ChildAvatar from "./src/screens/ChildAvatar";
import { initDb } from "./src/services/db";

export type RootStackParamList = {
  ParentHome: undefined;
  ChildAvatar: { routineId: string; childId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  React.useEffect(() => { initDb(); }, []);
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: true }}>
          <Stack.Screen name="ParentHome" component={ParentHome} options={{ title: "Buddy • Parent" }} />
          <Stack.Screen name="ChildAvatar" component={ChildAvatar} options={{ title: "Buddy • Avatar" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}