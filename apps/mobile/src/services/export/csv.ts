import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { listEvents, deserializeEventValue } from "../db/models";
import { toIso } from "../../lib/time";
import { safeStringify } from "../../lib/json";

interface CsvRow {
  id: string;
  session_id: string;
  ts_iso: string;
  step_id: string;
  type: string;
  value: string;
}

export async function exportEventsCsv(): Promise<void> {
  const events = await listEvents();
  if (!events.length) {
    Alert.alert("Export", "No events to export yet.");
    return;
  }

  const rows: CsvRow[] = events.map((event) => {
    const parsed = deserializeEventValue<Record<string, unknown>>(event) ?? {};
    return {
      id: event.id,
      session_id: event.session_id,
      ts_iso: toIso(event.ts),
      step_id: event.step_id ?? "",
      type: event.type,
      value: safeStringify(parsed),
    };
  });

  const csvContent = buildCsv(rows);
  const filename = `coachcoo-events-${Date.now()}.csv`;
  const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(target, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  try {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      Alert.alert("Export", `CSV saved to ${target}`);
      return;
    }

    await Sharing.shareAsync(target, {
      dialogTitle: "Export CoachCoo Events",
    });
  } finally {
    await FileSystem.deleteAsync(target, { idempotent: true });
  }
}

function buildCsv(rows: CsvRow[]): string {
  const header = ["id", "session_id", "ts_iso", "step_id", "type", "value"].join(",");
  const lines = rows.map((row) =>
    [row.id, row.session_id, row.ts_iso, row.step_id, row.type, row.value].map(csvEscape).join(",")
  );
  return [header, ...lines].join("\n");
}

function csvEscape(input: string): string {
  const value = input ?? "";
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
