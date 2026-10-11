import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  /** Omit for a static row (e.g. one that only hosts a switch) */
  onPress?: () => void;
  /** Replaces the chevron — a `Switch`, a value, a spinner */
  accessory?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Draws the hairline between stacked rows */
  divider?: boolean;
};

/** Settings-style row: icon, label, optional detail, trailing chevron or accessory. */
export const ListRow = memo(function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  accessory,
  tone = "default",
  disabled,
  divider,
}: Props) {
  const danger = tone === "danger";
  const tint = danger ? theme.danger : theme.accentSecondary;

  const content = (
    <>
      <View style={[styles.iconTile, danger && styles.iconTileDanger]}>
        <MaterialCommunityIcons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {accessory ??
        (onPress ? <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} /> : null)}
    </>
  );

  const rowStyle = [styles.row, divider && styles.divider, disabled && styles.disabled];

  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      {content}
    </Pressable>
  );
});

/** Rounded container that groups `ListRow`s under an optional heading. */
export const ListGroup = memo(function ListGroup({
  title,
  footnote,
  children,
}: {
  title?: string;
  footnote?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.groupBody}>{children}</View>
      {footnote ? <Text style={styles.groupFootnote}>{footnote}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    minHeight: 56,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceLg,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  pressed: { backgroundColor: theme.bgRaised },
  disabled: { opacity: 0.5 },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: theme.radiusSm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentSecondaryMuted,
  },
  iconTileDanger: { backgroundColor: theme.dangerSurface },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "700", color: theme.text },
  titleDanger: { color: theme.danger },
  subtitle: { marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: "500", color: theme.textMuted },
  group: { marginTop: theme.spaceXl },
  groupTitle: {
    ...theme.typeKicker,
    color: theme.textMuted,
    marginBottom: theme.spaceSm,
    marginLeft: theme.spaceXs,
  },
  groupBody: {
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    overflow: "hidden",
  },
  groupFootnote: {
    marginTop: theme.spaceSm,
    marginHorizontal: theme.spaceXs,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: theme.textMuted,
  },
});
