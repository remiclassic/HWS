import { memo, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View, type TextStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

/** Web: the wrapper draws the focus ring, so drop the browser's own outline on the input. */
const webNoOutline = { outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle;

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** Rendered inside the field's trailing edge (e.g. scan shortcut) */
  trailing?: ReactNode;
  accessibilityLabel?: string;
};

export const SearchField = memo(function SearchField({
  value,
  onChangeText,
  placeholder,
  trailing,
  accessibilityLabel,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <MaterialCommunityIcons
        name="magnify"
        size={22}
        color={focused ? theme.accentSecondary : theme.textMuted}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.inputPlaceholder}
        style={[styles.input, Platform.OS === "web" && webNoOutline]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        selectionColor={theme.accentSecondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel ?? placeholder}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={10}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <MaterialCommunityIcons name="close-circle" size={20} color={theme.textMuted} />
        </Pressable>
      ) : null}
      {trailing}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    minHeight: 48,
    paddingLeft: theme.spaceMd,
    paddingRight: theme.spaceXs,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgElevated,
  },
  wrapFocused: { borderColor: theme.accentSecondary },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "500",
    color: theme.text,
  },
  clearBtn: { padding: theme.spaceXs },
});
