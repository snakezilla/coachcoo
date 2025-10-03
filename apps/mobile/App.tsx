import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ParentHome } from "./src/ui/screens/ParentHome";
import { ChildAvatarScreen } from "./src/ui/screens/ChildAvatar";
import { ChildChatScreen } from "./src/ui/screens/ChildChat";
import { SettingsScreen } from "./src/ui/screens/Settings";
import { initDb } from "./src/services/db";
import { RootStackParamList } from "./src/ui/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        await initDb();
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: true }}>
          <Stack.Screen
            name="ParentHome"
            component={ParentHome}
            options={{ title: "Buddy • Parent" }}
          />
          <Stack.Screen
            name="ChildAvatar"
            component={ChildAvatarScreen}
            options={{ title: "Buddy • Avatar" }}
          />
          <Stack.Screen
            name="ChildChat"
            component={ChildChatScreen}
            options={{ title: "Buddy • Chat" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
