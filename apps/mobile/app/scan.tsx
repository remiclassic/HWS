import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { setPendingBarcode } from "../lib/pendingScanStorage";
import { theme } from "../lib/theme";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const [, setTick] = useState(0);

  const onBarcodeScanned = useCallback(
    (result: { data: string }) => {
      if (handled.current) return;
      handled.current = true;
      void (async () => {
        await setPendingBarcode(result.data);
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)");
      })();
    },
    [],
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="barcode-off" size={48} color={theme.textMuted} />
        <Text style={styles.title}>Scanner not on web</Text>
        <Text style={styles.sub}>Use the Spotter tab and type a SKU or casting name, or run the app on a device.</Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnTxt}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Checking camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="camera-outline" size={44} color={theme.accent} />
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.sub}>We only use the camera to read product barcodes for quick lookup.</Text>
        <Pressable
          style={styles.btn}
          onPress={() => {
            void requestPermission().then(() => setTick((t) => t + 1));
          }}
        >
          <Text style={styles.btnTxt}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={() => router.back()}>
          <Text style={styles.btnGhostTxt}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

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
        <Text style={styles.hint}>Point at a UPC or QR on the card or case</Text>
        <Pressable style={styles.closeFab} onPress={() => router.back()} accessibilityLabel="Close scanner">
          <MaterialCommunityIcons name="close" size={28} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: theme.spaceLg,
  },
  hint: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: theme.space2xl,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeFab: {
    position: "absolute",
    top: theme.spaceLg,
    right: theme.spaceLg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
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
  },
  muted: { color: theme.textMuted },
  btn: {
    marginTop: theme.spaceMd,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    paddingHorizontal: theme.spaceXl,
    borderRadius: theme.radiusMd,
  },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnGhost: { padding: theme.spaceMd },
  btnGhostTxt: { color: theme.accent, fontWeight: "700", fontSize: 16 },
});
