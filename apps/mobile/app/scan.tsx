import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { IconBarcodeScan } from "../components/icons/AppIcons";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { setPendingBarcode } from "../lib/pendingScanStorage";
import { theme } from "../lib/theme";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const [, setTick] = useState(0);

  const onBarcodeScanned = useCallback((result: { data: string }) => {
    if (handled.current) return;
    handled.current = true;
    void (async () => {
      await setPendingBarcode(result.data);
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    })();
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <IconBarcodeScan color={theme.accentSecondary} size={56} />
        <Text style={styles.title}>Scanner needs a device</Text>
        <Text style={styles.sub}>
          On web, search from the Spotter tab by casting name or SKU. Use the mobile app to scan barcodes in
          the aisle.
        </Text>
        <PrimaryButton label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={styles.muted}>Checking camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <IconBarcodeScan color={theme.accent} size={52} />
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.sub}>We only use the camera to read product barcodes for quick lookup.</Text>
        <View style={styles.btnStack}>
          <PrimaryButton
            label="Allow camera"
            onPress={() => {
              void requestPermission().then(() => setTick((t) => t + 1));
            }}
          />
          <PrimaryButton label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom + theme.spaceMd, theme.spaceXl);

  return (
    <View style={styles.root}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "qr"],
        }}
        onBarcodeScanned={onBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.overlayTop, { paddingTop: insets.top + theme.spaceSm }]}>
          <Pressable
            style={({ pressed }) => [styles.closeFab, pressed && styles.closeFabPressed]}
            onPress={() => {
              void Haptics.selectionAsync();
              router.back();
            }}
            accessibilityLabel="Close scanner"
            accessibilityRole="button"
          >
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.targetStage} pointerEvents="none">
          <View style={styles.scanTarget} />
        </View>

        <View style={[styles.overlayBottom, { paddingBottom: bottomPad }]}>
          <Text style={styles.hint}>Align the UPC or QR inside the frame</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  overlayTop: {
    paddingHorizontal: theme.spaceLg,
    alignItems: "flex-end",
  },
  overlayBottom: {
    paddingHorizontal: theme.spaceLg,
  },
  targetStage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spaceLg,
  },
  scanTarget: {
    width: "100%",
    maxWidth: 340,
    aspectRatio: 1.65,
    borderRadius: theme.radiusLg,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    backgroundColor: "transparent",
  },
  hint: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(7,20,34,0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeFabPressed: {
    backgroundColor: "rgba(7,20,34,0.88)",
    transform: [{ scale: 0.96 }],
  },
  closeGlyph: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "600",
    marginTop: -1,
  },
  center: {
    flex: 1,
    backgroundColor: theme.bg,
    padding: theme.spaceXl,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spaceMd,
  },
  title: { ...theme.typeTitleMd, color: theme.text, textAlign: "center" },
  sub: {
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "500",
    maxWidth: 340,
  },
  muted: { color: theme.textMuted, fontWeight: "600" },
  btnStack: {
    marginTop: theme.spaceSm,
    width: "100%",
    maxWidth: 320,
    gap: theme.spaceSm,
  },
});
