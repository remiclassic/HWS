import { memo } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { theme } from "../../lib/theme";

type Props = {
  /** Kept as a string so the field can be cleared while typing; parse on submit. */
  value: string;
  onChange: (next: string) => void;
  min?: number;
  max?: number;
};

/** − / number / + control. The number stays directly editable for large quantities. */
export const QuantityStepper = memo(function QuantityStepper({ value, onChange, min = 1, max = 999 }: Props) {
  const n = parseInt(value, 10);
  const current = Number.isFinite(n) ? n : min;

  const step = (delta: number) => {
    void Haptics.selectionAsync();
    onChange(String(Math.max(min, Math.min(max, current + delta))));
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => step(-1)}
        disabled={current <= min}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, current <= min && styles.btnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <MaterialCommunityIcons name="minus" size={22} color={theme.text} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, String(max).length))}
        keyboardType="number-pad"
        selectTextOnFocus
        style={styles.input}
        accessibilityLabel="Quantity"
      />
      <Pressable
        onPress={() => step(1)}
        disabled={current >= max}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, current >= max && styles.btnDisabled]}
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
    alignSelf: "flex-start",
    alignItems: "center",
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.bgSubtle,
    overflow: "hidden",
  },
  btn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  btnPressed: { backgroundColor: theme.bgRaised },
  btnDisabled: { opacity: 0.35 },
  input: {
    width: 64,
    height: 52,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
  },
});
