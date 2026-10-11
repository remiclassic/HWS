import { memo, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** Replaces the chevron — e.g. a Switch or a value label. */
  right?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  /** Omit for a static row (no chevron, not focusable). */
  onPress?: () => void;
  a11yLabel?: string;
};

/** One row of a grouped list — stack inside `ListGroup` for settings-style sections. */
export const ListRow = memo(function ListRow({
  title,
  subtitle,
  icon,
  right,
  destructive,
  disabled,
  onPress,
  a11yLabel,
}: Props) {
  const tint = destructive ? theme.danger : theme.text;
  const body = (
    <>
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={destructive ? theme.danger : theme.accentSecondary}
          style={styles.icon}
        />
      ) : null}
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: tint }]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ??
        (onPress && !destructive ? (
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
        ) : null)}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? title}
    >
      {body}
    </Pressable>
  );
});

/** Rounded container that separates its `ListRow` children with hairlines. */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.groupWrap}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupWrap: { marginTop: theme.spaceXl },
  groupTitle: {
    ...theme.typeKicker,
    color: theme.textMuted,
    marginBottom: theme.spaceSm,
    marginLeft: theme.spaceXs,
  },
  group: {
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    minHeight: 56,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceLg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    // The group clips the last row's divider against its own border
    marginBottom: -StyleSheet.hairlineWidth,
  },
  pressed: { backgroundColor: theme.bgRaised },
  disabled: { opacity: 0.55 },
  icon: { width: 24, textAlign: "center" },
  textBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { marginTop: 2, fontSize: 13, lineHeight: 18, color: theme.textMuted, fontWeight: "500" },
});
