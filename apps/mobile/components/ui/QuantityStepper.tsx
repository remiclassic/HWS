import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

type Props = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
};

export const QuantityStepper = memo(function QuantityStepper({ value, onChange, min = 1, max = 999 }: Props) {
  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next === value) return;
    void Haptics.selectionAsync();
    onChange(next);
  };
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="adjustable"
      accessibilityLabel="Quantity"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
    >
      <Pressable
        onPress={() => step(-1)}
        disabled={atMin}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, atMin && styles.btnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <MaterialCommunityIcons name="minus" size={22} color={theme.text} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        onPress={() => step(1)}
        disabled={atMax}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, atMax && styles.btnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
      >
        <MaterialCommunityIcons name="plus" size={22} color={theme.text} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  btn: {
    width: theme.touchTargetMin,
    height: theme.touchTargetMin,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { opacity: 0.6 },
  btnDisabled: { opacity: 0.3 },
  value: {
    minWidth: 44,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: theme.text,
    fontVariant: ["tabular-nums"],
  },
});
