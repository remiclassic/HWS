import { forwardRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

/** Web: the wrapper shows focus with its border, so drop the browser's default ring. */
const webInputOutline = { outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle;

type Props = Omit<TextInputProps, "style"> & {
  label: string;
  /** Renders a show/hide toggle; `secureTextEntry` is managed here. */
  password?: boolean;
  hint?: string;
};

/** Labelled form input with focus state and an optional password reveal toggle. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, password, hint, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused]}>
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={password ? !revealed : inputProps.secureTextEntry}
          placeholderTextColor={theme.inputPlaceholder}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, Platform.OS === "web" && webInputOutline]}
        />
        {password ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <MaterialCommunityIcons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={theme.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spaceLg },
  label: { fontSize: 13, fontWeight: "800", color: theme.textSecondary, marginBottom: 6 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    minHeight: 52,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.bgSubtle,
  },
  boxFocused: { borderColor: theme.accentSecondary },
  input: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: "600", color: theme.text, paddingVertical: 12 },
  hint: { marginTop: 6, fontSize: 13, lineHeight: 18, fontWeight: "500", color: theme.textMuted },
});
