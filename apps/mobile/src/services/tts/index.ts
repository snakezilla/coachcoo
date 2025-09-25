import * as Speech from "expo-speech";

export async function speak(text: string) {
  return new Promise<void>((resolve) => {
    Speech.speak(text, { onDone: () => resolve() });
  });
}

export function stopSpeak() {
  Speech.stop();
}