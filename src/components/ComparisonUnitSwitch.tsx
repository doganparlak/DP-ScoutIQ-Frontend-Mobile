import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ACCENT, LINE, MUTED, PANEL } from "@/theme";
import type { MetricUnit } from "@/utils/comparisonGroups";
export default function UnitSwitch({
  value,
  onChange,
  allowTotal,
  tr,
}: {
  value: MetricUnit;
  onChange: (unit: MetricUnit) => void;
  allowTotal: boolean;
  tr: boolean;
}) {
  return (
    <View style={styles.switch}>
      {(
        (allowTotal
          ? ["perMatch", "per90", "total"]
          : ["perMatch", "per90"]) as MetricUnit[]
      ).map((unit, index) => (
        <Pressable
          key={unit}
          testID={`unit-${unit}`}
          accessibilityRole="button"
          accessibilityState={{
            selected: value === unit,
          }}
          onPress={() => onChange(unit)}
          style={[styles.option, value === unit && styles.active]}
        >
          <Text
            style={[styles.optionText, value === unit && { color: ACCENT }]}
          >
            {
              (tr
                ? ["Maç Başı", "90 Dakika", "Toplam"]
                : ["Per Match", "Per 90", "Total"])[index]
            }
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: "row",
    backgroundColor: PANEL,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    padding: 4,
    gap: 3,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 999,
  },
  active: { backgroundColor: "rgba(22,163,74,.16)" },
  optionText: { fontSize: 10.5, fontWeight: "900", color: MUTED },
});
