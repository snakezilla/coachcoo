import React from "react";
import { View, Text, TextInput, Button, Alert, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useStore } from "../state/store";
import { exec, query, purgeAll, getLatestChild } from "../services/db";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

type Props = NativeStackScreenProps<RootStackParamList, "ParentHome">;

export default function ParentHome({ navigation }: Props) {
  const { currentChild, setChild } = useStore();
  const [name, setName] = React.useState(currentChild?.displayName ?? "");
  const [loadingProfile, setLoadingProfile] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const row = await getLatestChild();
        if (row && active) {
          setChild({ id: row.id, displayName: row.display_name });
        }
      } catch (err) {
        console.error("Failed to load child profile", err);
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();
    return () => { active = false; };
  }, [setChild]);

  React.useEffect(() => {
    setName(currentChild?.displayName ?? "");
  }, [currentChild]);

  async function ensureChild() {
    const displayName = name.trim() || "Buddy";
    if (currentChild) {
      await exec(`UPDATE child SET display_name=? WHERE id=?`, [displayName, currentChild.id]);
      setChild({ id: currentChild.id, displayName });
      return currentChild.id;
    }
    const id = Math.random().toString(36).slice(2);
    await exec(`INSERT INTO child(id, display_name, created_at) VALUES(?,?,?)`, [id, displayName, Date.now()]);
    setChild({ id, displayName });
    return id;
  }

  async function exportCsv() {
    const events = await query<any>(`SELECT * FROM event ORDER BY ts ASC`);
    if (events.length === 0) { Alert.alert("No data to export"); return; }
    const cols = Object.keys(events[0]);
    const head = cols.join(",");
    const body = events.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
    const csv = head + "\n" + body;
    const path = FileSystem.cacheDirectory + `buddy_events_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Child Profile</Text>
      <TextInput placeholder="Child name" value={name} onChangeText={setName}
        editable={!loadingProfile}
        style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
      <Button title="Save Profile"
        disabled={loadingProfile}
        onPress={async () => {
          const id = await ensureChild();
          Alert.alert("Saved", `Child ID: ${id}`);
        }} />

      <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 16 }}>Start Morning Routine</Text>
      <Button title="Start Morning" disabled={loadingProfile} onPress={async () => {
        const id = await ensureChild();
        navigation.navigate("ChildAvatar", { routineId: "morning_v1", childId: id });
      }} />
      <Button title="Start Greetings" disabled={loadingProfile} onPress={async () => {
        const id = await ensureChild();
        navigation.navigate("ChildAvatar", { routineId: "greetings_v1", childId: id });
      }} />

      <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 16 }}>Data</Text>
      <Button title="Export CSV" onPress={exportCsv} />
      <Button title="Privacy: Wipe Local Data" color="#a00" onPress={async () => {
        await purgeAll();
        Alert.alert("Wiped", "Events and sessions cleared.");
      }} />
    </ScrollView>
  );
}
