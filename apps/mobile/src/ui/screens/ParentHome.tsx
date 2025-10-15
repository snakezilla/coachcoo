import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../../state/store";
import {
  createChild,
  createSession,
  getLatestChild,
  initDb,
  purgeAll,
} from "../../services/db";
import { updateChildName } from "../../services/db/models";
import { exportEventsCsv } from "../../services/export/csv";
import { nanoId } from "../../lib/id";
import { validateRoutine } from "../../engine/runtime/validators";
import { Routine } from "../../engine/stateMachine/types";

import morningRoutine from "../../content/packs/morning_v2.json";
import greetingsRoutine from "../../content/packs/greetings_v2.json";

const ROUTINE_PACKS: Record<string, Routine> = {
  [morningRoutine.id]: morningRoutine as Routine,
  [greetingsRoutine.id]: greetingsRoutine as Routine,
};

const ROUTINE_ORDER = [morningRoutine.id, greetingsRoutine.id];

export const ParentHome: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentChild, setCurrentChild, setCurrentSession, clearAll } = useAppStore();
  const [name, setName] = React.useState(currentChild?.displayName ?? "");
  const [loadingRoutineId, setLoadingRoutineId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setName(currentChild?.displayName ?? "");
  }, [currentChild?.displayName]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      await initDb();
      const child = await getLatestChild();
      if (child && active) {
        setCurrentChild({
          id: child.id,
          displayName: child.display_name,
          createdAt: child.created_at,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [setCurrentChild]);

  const ensureChildProfile = React.useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Profile", "Add your child's name before starting a routine.");
      throw new Error("missing_name");
    }
    const now = Date.now();
    if (currentChild) {
      if (currentChild.displayName !== trimmed) {
        await updateChildName(currentChild.id, trimmed);
        setCurrentChild({ ...currentChild, displayName: trimmed });
      }
      return { ...currentChild, displayName: trimmed };
    }
    const childId = nanoId();
    await createChild({ id: childId, display_name: trimmed, created_at: now });
    const profile = { id: childId, displayName: trimmed, createdAt: now };
    setCurrentChild(profile);
    return profile;
  }, [currentChild, name, setCurrentChild]);

  const handleStartRoutine = React.useCallback(
    async (routineId: string) => {
      try {
        setLoadingRoutineId(routineId);
        const childProfile = await ensureChildProfile();
        const pack = ROUTINE_PACKS[routineId];
        if (!pack) {
          Alert.alert("Routine", "Routine pack missing.");
          return;
        }
        const validation = validateRoutine(pack);
        if (!validation.ok) {
          Alert.alert("Routine", validation.errors.join("\n"));
          return;
        }
        const routine = validation.routine;
        const sessionId = nanoId();
        const startedAt = Date.now();
        await createSession({
          id: sessionId,
          child_id: childProfile.id,
          routine_id: routine.id,
          started_at: startedAt,
        });
        setCurrentSession({ id: sessionId, routineId: routine.id, startedAt });
        navigation.navigate("ChildAvatar", {
          routineId: routine.id,
          childId: childProfile.id,
          sessionId,
        });
      } catch (error) {
        if ((error as Error)?.message === "missing_name") return;
        Alert.alert("Routine", (error as Error)?.message ?? "Unable to launch routine");
      } finally {
        setLoadingRoutineId(null);
      }
    },
    [ensureChildProfile, navigation, setCurrentSession]
  );

  const handleStartChat = React.useCallback(async () => {
    try {
      const childProfile = await ensureChildProfile();
      navigation.navigate("ChildChat", { childId: childProfile.id });
    } catch (error) {
      if ((error as Error)?.message === "missing_name") return;
      Alert.alert("Chat", (error as Error)?.message ?? "Unable to start chat");
    }
  }, [ensureChildProfile, navigation]);

  const handleStartVoice = React.useCallback(async () => {
    try {
      const childProfile = await ensureChildProfile();
      navigation.navigate("VoiceConversation", { childId: childProfile.id });
    } catch (error) {
      if ((error as Error)?.message === "missing_name") return;
      Alert.alert("Voice", (error as Error)?.message ?? "Unable to start voice chat");
    }
  }, [ensureChildProfile, navigation]);

  const handleExport = React.useCallback(async () => {
    await exportEventsCsv();
  }, []);

  const handleWipe = React.useCallback(() => {
    Alert.alert("Wipe data", "This clears local progress. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Wipe",
        style: "destructive",
        onPress: async () => {
          await purgeAll();
          clearAll();
          setName("");
        },
      },
    ]);
  }, [clearAll]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Coach Coo Parent</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Child name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Your kiddo's name"
        />
        <Text style={styles.caption}>Stored only on this device.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Routines</Text>
        {ROUTINE_ORDER.map((routineId) => {
          const pack = ROUTINE_PACKS[routineId];
          return (
            <Pressable
              key={routineId}
              style={[styles.button, loadingRoutineId === routineId && styles.buttonDisabled]}
              onPress={() => handleStartRoutine(routineId)}
              disabled={loadingRoutineId === routineId}
            >
              <Text style={styles.buttonText}>{pack.title}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Admin</Text>
        <Pressable style={styles.link} onPress={handleStartChat}>
          <Text style={styles.linkText}>Open Coo Chat (Avatar Demo)</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={handleStartVoice}>
          <Text style={styles.linkText}>Start Voice Conversation (Beta)</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => navigation.navigate("Settings")}> 
          <Text style={styles.linkText}>Settings</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={handleExport}>
          <Text style={styles.linkText}>Export events CSV</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={handleWipe}>
          <Text style={[styles.linkText, styles.destructive]}>Wipe local data</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    rowGap: 24,
    backgroundColor: "#f8fafc",
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    rowGap: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  caption: {
    fontSize: 12,
    color: "#64748b",
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  link: {
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2563eb",
  },
  destructive: {
    color: "#dc2626",
  },
});

export default ParentHome;
