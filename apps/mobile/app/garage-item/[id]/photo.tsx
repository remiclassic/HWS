import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { useToast } from "../../../components/ui/Toast";
import { errorMessage } from "../../../lib/errors";
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
  const toast = useToast();

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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.show(
        res.queued
          ? { kind: "info", message: "Offline — photo will upload when you’re back online." }
          : { message: "Photo added" },
      );
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/garage");
    },
    onError: (e) => toast.show({ kind: "error", message: errorMessage(e) }),
  });

  const onShutter = useCallback(() => {
    if (!ready || upload.isPending) return;
    void (async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const pic = await camRef.current?.takePictureAsync({ quality: 0.9 });
        if (!pic?.uri) {
          toast.show({ kind: "error", message: "Couldn’t capture a photo. Try again." });
          return;
        }
        const prepared = await preparePhotoForUpload(pic.uri, guessMimeFromUri(pic.uri), pic.width, pic.height);
        upload.mutate({ uri: prepared.uri, mime: prepared.mimeType });
      } catch (e) {
        toast.show({ kind: "error", message: errorMessage(e) });
      }
    })();
  }, [ready, upload, toast]);

  const pickFromLibrary = useCallback(() => {
    if (upload.isPending) return;
    void (async () => {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          toast.show({ kind: "error", message: "Allow photo library access to pick a photo." });
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
        toast.show({ kind: "error", message: errorMessage(e) });
      }
    })();
  }, [upload, toast]);

  if (!garageItemId) {
    return (
      <View style={styles.center}>
        <EmptyState icon="car-off" title="Entry not found" body="Open this from a car in your garage.">
          <PrimaryButton label="Go back" variant="ghost" onPress={() => router.back()} />
        </EmptyState>
      </View>
    );
  }

  // Web target: no live camera, use the library picker (works for local dev too).
  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="image-plus"
          title="Upload a photo"
          body="Choose an image from your device — it’s resized and metadata is stripped before upload."
        >
          <PrimaryButton label="Choose file" onPress={pickFromLibrary} loading={upload.isPending} />
          <PrimaryButton label="Cancel" variant="ghost" onPress={() => router.back()} />
        </EmptyState>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accentSecondary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="camera-outline"
          title="Camera access"
          body="Allow the camera to snap a photo, or pick one from your library."
        >
          <PrimaryButton
            label="Allow camera"
            onPress={() => {
              void requestPermission().then(() => setTick((t) => t + 1));
            }}
          />
          <PrimaryButton label="Pick from library" variant="ghost" onPress={pickFromLibrary} />
          <PrimaryButton label="Cancel" variant="ghost" onPress={() => router.back()} />
        </EmptyState>
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
