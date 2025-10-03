import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface RewardStarsProps {
  points?: number;
  sticker?: string;
}

export const RewardStars: React.FC<RewardStarsProps> = ({ points, sticker }) => {
  if (points == null && !sticker) return null;
  return (
    <View style={styles.container}>
      {points != null && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⭐️ {points}</Text>
        </View>
      )}
      {sticker && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sticker}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    columnGap: 8,
    marginVertical: 12,
  },
  badge: {
    backgroundColor: "rgba(250, 204, 21, 0.18)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
