import { memo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

/** Web: the wrapper draws the focus ring, so drop the browser's own outline on the input. */
const webNoOutline = { outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle;

type Props = Omit<TextInputProps, "style" | "placeholderTextColor"> & {
  label: string;
  /** Helper under the field; replaced by `error` when set */
  hint?: string;
  error?: string | null;
  /** Password field with a show/hide toggle */
  secure?: boolean;
};

/** Labelled input with focus ring, helper/error line, and optional password reveal. */
export const TextField = memo(function TextField({ label, hint, error, secure, multiline, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, error ? styles.fieldError : null]}>
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={theme.inputPlaceholder}
          selectionColor={theme.accentSecondary}
          style={[styles.input, multiline && styles.inputMultiline, Platform.OS === "web" && webNoOutline]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={label}
        />
        {secure ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            style={styles.reveal}
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
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spaceLg },
  label: { fontSize: 14, fontWeight: "700", color: theme.textSecondary, marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgSubtle,
  },
  fieldFocused: { borderColor: theme.accentSecondary },
  fieldError: { borderColor: theme.danger },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "500",
    color: theme.text,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: "top" },
  reveal: { paddingHorizontal: theme.spaceMd },
  hint: { marginTop: 6, fontSize: 13, lineHeight: 18, fontWeight: "500", color: theme.textMuted },
  error: { marginTop: 6, fontSize: 13, lineHeight: 18, fontWeight: "600", color: theme.danger },
});
