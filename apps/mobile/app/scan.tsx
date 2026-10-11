import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { IconBarcodeScan } from "../components/icons/AppIcons";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { recordGamificationScan } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { setPendingBarcode } from "../lib/pendingScanStorage";
import { theme } from "../lib/theme";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [manualCode, setManualCode] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const [, setTick] = useState(0);
  const [torch, setTorch] = useState(false);

  const onBarcodeScanned = useCallback((result: { data: string }) => {
    if (handled.current) return;
    handled.current = true;
    void (async () => {
      await setPendingBarcode(result.data);
      void recordGamificationScan()
        .then(() => queryClient.invalidateQueries({ queryKey: ["gamification"] }))
        .catch(() => {});
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    })();
  }, []);

  if (Platform.OS === "web") {
    const applyManual = () => {
      const code = manualCode.trim();
      if (!code) return;
      void (async () => {
        await setPendingBarcode(code);
        void recordGamificationScan()
          .then(() => queryClient.invalidateQueries({ queryKey: ["gamification"] }))
          .catch(() => {});
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)");
      })();
    };
    return (
      <View style={styles.center}>
        <IconBarcodeScan color={theme.accentSecondary} size={56} />
        <Text style={styles.title}>Enter barcode or SKU</Text>
        <Text style={styles.sub}>
          On web there’s no camera scanner. Type the code from the package, then we’ll jump back to Spotter
          search with it filled in.
        </Text>
        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="UPC, EAN, or SKU"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          onSubmitEditing={applyManual}
          style={styles.webInput}
        />
        <View style={styles.btnStack}>
          <PrimaryButton label="Search with this code" onPress={applyManual} />
          <PrimaryButton label="Go back" variant="ghost" onPress={() => router.back()} />
        </View>
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
        enableTorch={torch}
        onBarcodeScanned={onBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.overlayTop, { paddingTop: insets.top + theme.spaceSm }]}>
          <Pressable
            style={({ pressed }) => [
              styles.closeFab,
              torch && styles.torchOn,
              pressed && styles.closeFabPressed,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setTorch((v) => !v);
            }}
            accessibilityLabel={torch ? "Turn flashlight off" : "Turn flashlight on"}
            accessibilityRole="button"
            accessibilityState={{ selected: torch }}
          >
            <MaterialCommunityIcons
              name={torch ? "flashlight" : "flashlight-off"}
              size={22}
              color={torch ? theme.textOnYellow : theme.text}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.closeFab, pressed && styles.closeFabPressed]}
            onPress={() => {
              void Haptics.selectionAsync();
              router.back();
            }}
            accessibilityLabel="Close scanner"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.targetStage} pointerEvents="none">
          <View style={styles.scanTarget}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        <View style={[styles.overlayBottom, { paddingBottom: bottomPad }]}>
          <View style={styles.hintPill}>
            <Text style={styles.hint}>Line up the barcode on the back of the card</Text>
          </View>
          <Text style={styles.hintSub}>No luck? Close this and type the number into search.</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
  },
  overlayBottom: {
    paddingHorizontal: theme.spaceLg,
    alignItems: "center",
    gap: theme.spaceSm,
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
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "#fff",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: theme.radiusLg },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: theme.radiusLg },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: theme.radiusLg,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: theme.radiusLg,
  },
  hintPill: {
    paddingVertical: theme.spaceSm,
    paddingHorizontal: theme.spaceLg,
    borderRadius: theme.radiusFull,
    backgroundColor: "rgba(7,20,34,0.78)",
  },
  hint: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
  },
  hintSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  torchOn: { backgroundColor: theme.trackYellow, borderColor: theme.trackYellow },
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
  webInput: {
    width: "100%",
    maxWidth: 360,
    marginTop: theme.spaceMd,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    backgroundColor: theme.bgElevated,
    color: theme.text,
    fontSize: 17,
    fontWeight: "600",
  },
});
