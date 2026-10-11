import { memo, type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body?: string;
  tone?: "neutral" | "danger";
  /** Buttons — the way out of this state */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Empty, error, and not-found states: says what happened and offers the next step. */
export const EmptyState = memo(function EmptyState({
  icon,
  title,
  body,
  tone = "neutral",
  children,
  style,
}: Props) {
  const danger = tone === "danger";
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconDisc, danger && styles.iconDiscDanger]}>
        <MaterialCommunityIcons
          name={icon}
          size={32}
          color={danger ? theme.danger : theme.accentSecondary}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: theme.space3xl,
    paddingHorizontal: theme.spaceXl,
  },
  iconDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentSecondaryMuted,
    marginBottom: theme.spaceLg,
  },
  iconDiscDanger: { backgroundColor: theme.dangerSurface },
  title: { ...theme.typeSection, fontSize: 19, color: theme.text, textAlign: "center" },
  body: {
    marginTop: theme.spaceSm,
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: theme.textSecondary,
    textAlign: "center",
  },
  actions: {
    marginTop: theme.spaceXl,
    width: "100%",
    maxWidth: 300,
    gap: theme.spaceSm,
  },
});
