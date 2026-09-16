import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LINE, TEXT } from "@/theme";

const ROW_HEIGHT = 48;
/** Screen-level overlay keeps all five visible rows tappable outside filter frames. */
export default function TeamSuggestionsOverlay({
  anchor,
  visible,
  options,
  onSelect,
}: {
  anchor: React.RefObject<View | null>;
  visible: boolean;
  options: string[];
  onSelect: (name: string) => void;
}) {
  const host = useRef<View>(null);
  const window = useWindowDimensions();
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardTop(e.endCoordinates.screenY),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardTop(null),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (!visible) {
      setPosition(null);
      return;
    }
    let active = true;
    const frame = requestAnimationFrame(() => {
      host.current?.measureInWindow((hx, hy, hw, hh) => {
        anchor.current?.measureInWindow((x, y, width, height) => {
          if (!active || !width || !hh) return;
          const bottom = Math.min(
            hh,
            keyboardTop === null ? hh : keyboardTop - hy,
          );
          const wanted = Math.min(5, options.length) * ROW_HEIGHT + 2;
          const below = y - hy + height + 4;
          const above = y - hy - wanted - 4;
          const top =
            below + wanted <= bottom
              ? below
              : above >= 0
                ? above
                : Math.max(0, bottom - wanted);
          setPosition({
            left: Math.max(0, Math.min(x - hx, hw - width)),
            top,
            width,
            height: Math.min(wanted, bottom - top),
          });
        });
      });
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [
    visible,
    anchor,
    options.length,
    window.width,
    window.height,
    keyboardTop,
  ]);
  return (
    <View
      ref={host}
      collapsable={false}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      {visible && position && (
        <ScrollView
          testID="team-suggestions-overlay"
          style={[styles.dropdown, position]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {options.map((name) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => onSelect(name)}
              style={styles.row}
            >
              <Text numberOfLines={2} style={styles.text}>
                {name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  dropdown: {
    position: "absolute",
    backgroundColor: "#161A17",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  row: {
    height: ROW_HEIGHT,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: LINE,
  },
  text: { fontSize: 13, color: TEXT },
});
