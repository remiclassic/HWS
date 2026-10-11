import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { UserCarCondition, UserCarStatus } from "@hotwheels/shared";
import { QuantityStepper } from "../ui/QuantityStepper";
import { SegmentedControl } from "../ui/SegmentedControl";
import { TextField } from "../ui/TextField";
import { theme } from "../../lib/theme";

const STATUS_OPTIONS: readonly { key: UserCarStatus; label: string }[] = [
  { key: "Owned", label: "Owned" },
  { key: "Want", label: "Want" },
  { key: "Duplicate", label: "Duplicate" },
];

const CONDITION_OPTIONS: readonly { key: UserCarCondition; label: string }[] = [
  { key: "Carded", label: "Carded" },
  { key: "Loose", label: "Loose" },
  { key: "Custom", label: "Custom" },
];

export type GarageEntryDraft = {
  status: UserCarStatus;
  condition: UserCarCondition;
  quantity: number;
  notes: string;
};

export const DEFAULT_GARAGE_ENTRY: GarageEntryDraft = {
  status: "Owned",
  condition: "Carded",
  quantity: 1,
  notes: "",
};

/** Status / condition / quantity / notes — shared by "add to garage" and the edit screen. */
export const GarageEntryForm = memo(function GarageEntryForm({
  value,
  onChange,
}: {
  value: GarageEntryDraft;
  onChange: (next: GarageEntryDraft) => void;
}) {
  const wanted = value.status === "Want";

  return (
    <View>
      <Text style={styles.label}>Status</Text>
      <SegmentedControl
        options={STATUS_OPTIONS}
        value={value.status}
        onChange={(status) => onChange({ ...value, status })}
        accessibilityLabel="Status"
      />

      {/* Condition and count describe a copy you hold — not one you're still hunting */}
      {wanted ? null : (
        <>
          <Text style={styles.label}>Condition</Text>
          <SegmentedControl
            options={CONDITION_OPTIONS}
            value={value.condition}
            onChange={(condition) => onChange({ ...value, condition })}
            accessibilityLabel="Condition"
          />

          <Text style={styles.label}>Quantity</Text>
          <QuantityStepper value={value.quantity} onChange={(quantity) => onChange({ ...value, quantity })} />
        </>
      )}

      <View style={styles.notes}>
        <TextField
          label="Notes"
          value={value.notes}
          onChangeText={(notes) => onChange({ ...value, notes })}
          placeholder={wanted ? "Where to look, price ceiling…" : "Where you found it, trades, condition detail…"}
          multiline
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.textSecondary,
    marginTop: theme.spaceLg,
    marginBottom: theme.spaceSm,
  },
  notes: { marginTop: theme.spaceLg },
});
