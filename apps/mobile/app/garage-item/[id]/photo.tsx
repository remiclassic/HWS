import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../../lib/theme";
import { uploadGarageItemPhoto } from "../../../lib/api";
import { enqueueGarageOp, isTransientNetworkError } from "../../../lib/garageMutationQueue";
import { getIsOnline } from "../../../lib/network";
import { preparePhotoForUpload } from "../../../lib/photoPipeline";

function guessMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export default function GarageItemPhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const garageItemId = typeof id === "string" ? id : "";
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [, setTick] = useState(0);
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: async (input: { uri: string; mime: string }) => {
      try {
        await uploadGarageItemPhoto(garageItemId, input.uri, input.mime);
        return { queued: false as const };
      } catch (e) {
        const likelyOffline = !(await getIsOnline());
        if (likelyOffline || isTransientNetworkError(e)) {
          await enqueueGarageOp({
            v: 1,
            kind: "uploadPhoto",
            garageItemId,
            localUri: input.uri,
            mimeType: input.mime,
          });
          return { queued: true as const };
        }
        throw e;
      }
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["garage"] });
      await qc.invalidateQueries({ queryKey: ["gamification"] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (res.queued) {
        Alert.alert("Offline", "Photo upload queued for when you're online.");
      }
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/garage");
    },
    onError: (e) => Alert.alert("Upload failed", e instanceof Error ? e.message : String(e)),
  });

  const onShutter = useCallback(() => {
    if (!ready || upload.isPending) return;
    void (async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const pic = await camRef.current?.takePictureAsync({ quality: 0.9 });
        if (!pic?.uri) {
          Alert.alert("Camera", "Could not capture a photo. Try again.");
          return;
        }
        const prepared = await preparePhotoForUpload(pic.uri, guessMimeFromUri(pic.uri), pic.width, pic.height);
        upload.mutate({ uri: prepared.uri, mime: prepared.mimeType });
      } catch (e) {
        Alert.alert("Camera", e instanceof Error ? e.message : String(e));
      }
    })();
  }, [ready, upload]);

  const pickFromLibrary = useCallback(() => {
    if (upload.isPending) return;
    void (async () => {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Photos", "Photo library permission is required.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
          allowsMultipleSelection: false,
          exif: false,
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        const prepared = await preparePhotoForUpload(
          asset.uri,
          asset.mimeType ?? guessMimeFromUri(asset.uri),
          asset.width,
          asset.height,
        );
        upload.mutate({ uri: prepared.uri, mime: prepared.mimeType });
      } catch (e) {
        Alert.alert("Pick photo", e instanceof Error ? e.message : String(e));
      }
    })();
  }, [upload]);

  if (!garageItemId) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Missing garage item.</Text>
      </View>
    );
  }

  // Web target: no live camera, use the library picker (works for local dev too).
  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="image-plus" size={48} color={theme.accent} />
        <Text style={styles.title}>Upload a photo</Text>
        <Text style={styles.sub}>Choose an image from your device — it&apos;s resized and metadata stripped before upload.</Text>
        <Pressable style={styles.btn} onPress={pickFromLibrary} disabled={upload.isPending}>
          {upload.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnTxt}>Choose file</Text>
          )}
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={() => router.back()}>
          <Text style={styles.btnGhostTxt}>Cancel</Text>
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
        <Text style={styles.sub}>Allow the camera to snap a photo, or pick one from your library.</Text>
        <Pressable
          style={styles.btn}
          onPress={() => {
            void requestPermission().then(() => setTick((t) => t + 1));
          }}
        >
          <Text style={styles.btnTxt}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={pickFromLibrary}>
          <Text style={styles.btnGhostTxt}>Pick from library</Text>
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
        ref={camRef}
        style={styles.camera}
        facing="back"
        mode="picture"
        onCameraReady={() => setReady(true)}
      />
      <View style={[styles.overlay, { pointerEvents: "box-none" }]}>
        <Text style={styles.hint}>Frame your car, then tap the shutter — or pick from library</Text>
        <View style={styles.bottomRow}>
          <Pressable
            onPress={pickFromLibrary}
            style={styles.libraryBtn}
            disabled={upload.isPending}
            accessibilityLabel="Pick from library"
          >
            <MaterialCommunityIcons name="image-outline" size={24} color="#fff" />
          </Pressable>
          <Pressable
            style={[styles.shutter, (!ready || upload.isPending) && styles.shutterDisabled]}
            onPress={onShutter}
            disabled={!ready || upload.isPending}
            accessibilityLabel="Take photo and upload"
          >
            {upload.isPending ? (
              <ActivityIndicator color="#111" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
          <View style={styles.libraryBtn} />
        </View>
        <Pressable style={styles.closeFab} onPress={() => router.back()} accessibilityLabel="Close">
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
    paddingBottom: theme.space2xl,
    paddingHorizontal: theme.spaceLg,
  },
  hint: {
    position: "absolute",
    bottom: 140,
    left: theme.spaceLg,
    right: theme.spaceLg,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    ...Platform.select({
      web: { textShadow: "0px 1px 4px rgba(0,0,0,0.75)" },
      default: {
        textShadowColor: "rgba(0,0,0,0.75)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spaceXl,
  },
  libraryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
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
  err: { color: theme.danger, fontWeight: "700" },
  btn: {
    marginTop: theme.spaceMd,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    paddingHorizontal: theme.spaceXl,
    borderRadius: theme.radiusMd,
    minWidth: 200,
    alignItems: "center",
  },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnGhost: { padding: theme.spaceMd },
  btnGhostTxt: { color: theme.accent, fontWeight: "700", fontSize: 16 },
});
