import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Pressable,StyleSheet,Text,View } from "react-native";

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
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT} = themed;

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


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, LINE, MUTED, PANEL, themeColor} = colors;

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
  active: { backgroundColor: themeColor("rgba(22,163,74,.16)", 'surface') },
  optionText: { fontSize: 10.5, fontWeight: "900", color: MUTED },
});
  return {ACCENT, LINE, MUTED, PANEL, styles, themeColor};
});
