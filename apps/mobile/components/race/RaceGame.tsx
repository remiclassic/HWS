import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Polygon } from "react-native-svg";
import { PrimaryButton } from "../ui/PrimaryButton";
import { RaceScene, newRaceSession, type RaceSession } from "./RaceScene";
import { formatRaceTime, ordinal, type Racer } from "../../lib/race/carStats";
import { loadTrackRecord, mergeTrackRecord, saveTrackRecord, type TrackRecord } from "../../lib/race/records";
import { TRACK, WAYPOINTS } from "../../lib/race/track";
import { theme } from "../../lib/theme";

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 800;
const HUD_POLL_MS = 100;
const PAD_STRIP_HEIGHT = 96;

type Phase = "countdown" | "racing" | "finished";

/** The four on-screen pads, left to right; each owns a quarter of the screen width. */
const PADS = [
  { label: "Steer left", kind: "steer", icon: "arrow-left-bold" },
  { label: "Steer right", kind: "steer", icon: "arrow-right-bold" },
  { label: "Brake", kind: "brake", icon: "car-brake-alert" },
  { label: "Gas", kind: "gas", icon: "speedometer" },
] as const;
type PadState = [boolean, boolean, boolean, boolean];

const KEY_PADS: Record<string, number> = {
  ArrowLeft: 0,
  a: 0,
  ArrowRight: 1,
  d: 1,
  ArrowDown: 2,
  s: 2,
  " ": 2,
  ArrowUp: 3,
  w: 3,
};

type Hud = RaceSession["hud"];

type Result = {
  place: number;
  time: number;
  bestLap: number;
  record: TrackRecord;
  newBestLap: boolean;
  newBestRace: boolean;
};

type Props = {
  /** Player first, then rivals in grid order. */
  racers: Racer[];
  laps: number;
  onRestart: () => void;
  onExit: () => void;
};

function haptic(kind: "tick" | "go" | "finish") {
  if (Platform.OS === "web") return;
  try {
    if (kind === "tick") void Haptics.selectionAsync();
    else if (kind === "go") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

const MAP_WIDTH = 64;
const MAP_PAD = 5;
const MAP_BOUNDS = WAYPOINTS.reduce(
  (acc, p) => ({
    minX: Math.min(acc.minX, p.x),
    maxX: Math.max(acc.maxX, p.x),
    minZ: Math.min(acc.minZ, p.z),
    maxZ: Math.max(acc.maxZ, p.z),
  }),
  { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
);
const MAP_SCALE = (MAP_WIDTH - MAP_PAD * 2) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);
const MAP_HEIGHT = (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ) * MAP_SCALE + MAP_PAD * 2;
const mapX = (x: number) => MAP_PAD + (x - MAP_BOUNDS.minX) * MAP_SCALE;
const mapY = (z: number) => MAP_PAD + (z - MAP_BOUNDS.minZ) * MAP_SCALE;
const MAP_OUTLINE = WAYPOINTS.map((p) => `${mapX(p.x).toFixed(1)},${mapY(p.z).toFixed(1)}`).join(" ");

/** Track outline with a dot per car; the start straight runs up the left edge. */
const MiniMap = memo(function MiniMap({ dots, racers }: { dots: { x: number; z: number }[]; racers: Racer[] }) {
  return (
    <View style={styles.miniMap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>
        <Polygon points={MAP_OUTLINE} fill="none" stroke="rgba(245, 248, 252, 0.75)" strokeWidth={3} strokeLinejoin="round" />
        {dots.map((d, i) =>
          i === 0 ? null : (
            <Circle key={racers[i].key} cx={mapX(d.x)} cy={mapY(d.z)} r={2.6} fill={racers[i].paint} stroke="#0A0F14" strokeWidth={0.8} />
          ),
        )}
        {dots.length > 0 ? (
          <Circle cx={mapX(dots[0].x)} cy={mapY(dots[0].z)} r={3.6} fill={theme.trackYellow} stroke="#0A0F14" strokeWidth={1} />
        ) : null}
      </Svg>
    </View>
  );
});

const HudCell = memo(function HudCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.hudCell} accessibilityLabel={`${label} ${value}`}>
      <Text style={styles.hudLabel}>{label}</Text>
      <Text style={styles.hudValue}>{value}</Text>
    </View>
  );
});

export function RaceGame({ racers, laps, onRestart, onExit }: Props) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [pads, setPads] = useState<PadState>([false, false, false, false]);
  const [result, setResult] = useState<Result | null>(null);

  // The 3D scene runs in its own React root (the R3F canvas) and steps the race every
  // frame; this object is the only thing the two sides share.
  const session = useMemo(() => newRaceSession(racers.length), [racers]);
  const [hud, setHud] = useState<Hud>(() => ({ ...session.hud }));
  const [dots, setDots] = useState<{ x: number; z: number }[]>([]);

  // Countdown → green light.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      haptic("go");
      session.running = true;
      setPhase("racing");
      return;
    }
    haptic("tick");
    const timer = setTimeout(() => setCount((c) => c - 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(timer);
  }, [phase, count, session]);

  useEffect(
    () => () => {
      session.running = false;
    },
    [session],
  );

  // The scene mutates `session` 60 times a second; the HUD only needs a glance at ten.
  useEffect(() => {
    if (phase === "finished") return;
    const timer = setInterval(() => {
      const h = session.hud;
      setHud((prev) =>
        prev.lap === h.lap &&
        prev.place === h.place &&
        prev.finished === h.finished &&
        prev.wrongWay === h.wrongWay &&
        prev.gear === h.gear &&
        Math.round(prev.speedKmh) === Math.round(h.speedKmh) &&
        Math.floor(prev.time * 10) === Math.floor(h.time * 10)
          ? prev
          : { ...h },
      );
      setDots(session.dots.map((d) => ({ x: d.x, z: d.z })));
    }, HUD_POLL_MS);
    return () => clearInterval(timer);
  }, [phase, session]);

  useEffect(() => {
    if (phase !== "racing" || !hud.finished) return;
    setPhase("finished");
    haptic("finish");
    const run = { place: hud.place, time: hud.time, bestLap: hud.bestLap };
    let cancelled = false;
    void loadTrackRecord(TRACK.id).then((prev) => {
      const merged = mergeTrackRecord(prev, { bestLap: run.bestLap, raceTime: run.time });
      if (merged.newBestLap || merged.newBestRace) void saveTrackRecord(TRACK.id, merged.record);
      if (!cancelled) setResult({ ...run, ...merged });
    });
    return () => {
      cancelled = true;
    };
    // `hud.finished` flips once per race; the other hud fields are read at that moment.
  }, [phase, hud.finished]);

  // ── Controls: four pads across the bottom — steer with the left thumb, pedals with the right. ──
  // Touches are read on the root view and sorted by screen quarter, so any number of
  // fingers can be down at once (Pressables only ever track one).
  const held = useRef({
    touch: [false, false, false, false] as PadState,
    keys: [false, false, false, false] as PadState,
  });
  const lastTouchAt = useRef(0);
  /** Window Y where the control zone starts; touches above it belong to the HUD buttons. */
  const zoneTop = useRef(0);
  const rootRef = useRef<View>(null);
  const hudHeight = useRef(0);

  const measureZone = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y) => {
      zoneTop.current = y + hudHeight.current;
    });
  }, []);
  const onHudLayout = useCallback(
    (e: LayoutChangeEvent) => {
      hudHeight.current = e.nativeEvent.layout.height;
      measureZone();
    },
    [measureZone],
  );

  const syncInput = useCallback(() => {
    const { touch, keys } = held.current;
    const next = PADS.map((_, i) => touch[i] || keys[i]) as PadState;
    const [left, right, brake, gas] = next;
    session.input.steer = left === right ? 0 : left ? -1 : 1;
    session.input.brake = brake;
    session.input.throttle = gas;
    setPads((prev) => (prev.every((on, i) => on === next[i]) ? prev : next));
  }, [session]);

  /** Which pad a point on the screen belongs to, or −1 for the HUD strip. */
  const padAt = useCallback((pageX: number, pageY: number) => {
    if (pageY < zoneTop.current) return -1;
    const quarter = Math.floor((pageX / Dimensions.get("window").width) * PADS.length);
    return Math.max(0, Math.min(PADS.length - 1, quarter));
  }, []);

  const onTouch = useCallback(
    (e: GestureResponderEvent) => {
      lastTouchAt.current = Date.now();
      const touches = e.nativeEvent.touches;
      const next: PadState = [false, false, false, false];
      for (let i = 0; i < touches.length; i++) {
        const pad = padAt(touches[i].pageX, touches[i].pageY);
        if (pad >= 0) next[pad] = true;
      }
      held.current.touch = next;
      syncInput();
    },
    [padAt, syncInput],
  );

  // Web dev: mouse + keyboard stand in for thumbs.
  const mouseProps = useMemo(() => {
    if (Platform.OS !== "web") return {};
    const release = () => {
      held.current.touch = [false, false, false, false];
      syncInput();
    };
    return {
      onMouseDown: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
        // Browsers replay a touch as a mouse click; ignore the echo.
        if (Date.now() - lastTouchAt.current < 800) return;
        const pad = padAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (pad < 0) return;
        const next: PadState = [false, false, false, false];
        next[pad] = true;
        held.current.touch = next;
        syncInput();
      },
      onMouseUp: release,
      onMouseLeave: release,
    };
  }, [padAt, syncInput]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const set = (e: KeyboardEvent, down: boolean) => {
      const pad = KEY_PADS[e.key];
      if (pad === undefined) return;
      held.current.keys[pad] = down;
      e.preventDefault();
      syncInput();
    };
    const onDown = (e: KeyboardEvent) => set(e, true);
    const onUp = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [syncInput]);

  const requestReset = useCallback(() => {
    session.input.resetRequested = true;
  }, [session]);


  return (
    <View
      ref={rootRef}
      style={styles.root}
      onLayout={measureZone}
      onTouchStart={onTouch}
      onTouchMove={onTouch}
      onTouchEnd={onTouch}
      onTouchCancel={onTouch}
      {...mouseProps}
    >
      <View style={styles.hud} onLayout={onHudLayout}>
        <HudCell label="Lap" value={`${Math.min(hud.lap, laps)}/${laps}`} />
        <HudCell label="Place" value={`${ordinal(hud.place)} of ${racers.length}`} />
        <HudCell label="Time" value={formatRaceTime(hud.time)} />
        <Pressable
          onPress={requestReset}
          style={({ pressed }) => [styles.resetBtn, pressed && styles.resetBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Put the car back on the track"
        >
          <MaterialCommunityIcons name="backup-restore" size={24} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.stage}>
        {/* The canvas never takes touches: steering is handled by the root view. */}
        <View style={styles.canvasWrap}>
          <RaceScene session={session} racers={racers} laps={laps} />
        </View>
        <MiniMap dots={dots} racers={racers} />
        <View style={styles.speedo} accessibilityLabel={`${Math.round(hud.speedKmh)} kilometres per hour`}>
          <Text style={styles.speedoValue}>{Math.round(hud.speedKmh)}</Text>
          <Text style={styles.speedoUnit}>km/h · gear {hud.gear}</Text>
        </View>
        {hud.wrongWay && phase === "racing" ? (
          <View style={styles.alert} accessibilityLiveRegion="assertive">
            <MaterialCommunityIcons name="alert" size={20} color={theme.textOnYellow} />
            <Text style={styles.alertTxt}>Wrong way</Text>
          </View>
        ) : null}
        {phase === "countdown" || (phase === "racing" && hud.time < 0.9) ? (
          <View style={styles.countdown}>
            <Animated.Text key={phase === "countdown" ? count : "go"} entering={ZoomIn.duration(220)} style={styles.countdownTxt}>
              {phase === "countdown" ? count : "GO!"}
            </Animated.Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.padStrip, { paddingBottom: Math.max(insets.bottom, theme.spaceSm) }]}>
        {PADS.map((pad, i) => (
          <View key={pad.label} style={styles.padCell}>
            <View
              style={[styles.pad, pads[i] && (pad.kind === "brake" ? styles.padBrake : pad.kind === "gas" ? styles.padGas : styles.padActive)]}
              accessibilityLabel={pad.label}
            >
              <MaterialCommunityIcons name={pad.icon} size={32} color={theme.text} />
              {pad.kind === "steer" ? null : <Text style={styles.padLabel}>{pad.label}</Text>}
            </View>
          </View>
        ))}
      </View>

      {phase === "finished" && result ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.resultScrim}>
          <View style={styles.resultCard} accessibilityLiveRegion="polite">
            <MaterialCommunityIcons
              name={result.place === 1 ? "trophy" : "flag-checkered"}
              size={44}
              color={result.place === 1 ? theme.trackYellow : theme.accentSecondary}
            />
            <Text style={styles.resultTitle}>{result.place === 1 ? "You won!" : `Finished ${ordinal(result.place)}`}</Text>
            <Text style={styles.resultCar} numberOfLines={1}>
              {racers[0].name} · {TRACK.name}
            </Text>
            <View style={styles.resultRows}>
              <ResultRow label="Race time" value={formatRaceTime(result.time)} isRecord={result.newBestRace} />
              <ResultRow label="Best lap" value={formatRaceTime(result.bestLap)} isRecord={result.newBestLap} />
              <ResultRow label="Track record" value={formatRaceTime(result.record.bestRace)} />
            </View>
            <View style={styles.resultActions}>
              <PrimaryButton label="Race again" onPress={onRestart} />
              <PrimaryButton label="Change car" variant="ghost" onPress={onExit} />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function ResultRow({ label, value, isRecord }: { label: string; value: string; isRecord?: boolean }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      {isRecord ? (
        <View style={styles.recordPill}>
          <Text style={styles.recordTxt}>New best</Text>
        </View>
      ) : null}
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, userSelect: "none" },

  hud: {
    flexDirection: "row",
    gap: theme.spaceSm,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: theme.spaceSm,
  },
  hudCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  hudLabel: { ...theme.typeKicker, fontSize: 10, color: theme.textSecondary },
  hudValue: { fontSize: 17, fontWeight: "900", color: theme.text, fontVariant: ["tabular-nums"] },

  resetBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radiusSm,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
  },
  resetBtnPressed: { backgroundColor: theme.bgRaised },

  stage: { flex: 1, overflow: "hidden", backgroundColor: "#a68070" },
  canvasWrap: { ...StyleSheet.absoluteFillObject, pointerEvents: "none" },
  miniMap: {
    pointerEvents: "none",
    position: "absolute",
    top: theme.spaceSm,
    right: theme.spaceSm,
    padding: 4,
    borderRadius: theme.radiusSm,
    backgroundColor: "rgba(5, 13, 26, 0.6)",
  },
  speedo: {
    pointerEvents: "none",
    position: "absolute",
    left: theme.spaceSm,
    bottom: theme.spaceSm,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 6,
    borderRadius: theme.radiusSm,
    backgroundColor: "rgba(5, 13, 26, 0.6)",
  },
  speedoValue: { fontSize: 28, fontWeight: "900", color: theme.text, fontVariant: ["tabular-nums"] },
  speedoUnit: { ...theme.typeKicker, fontSize: 10, color: theme.textSecondary },
  alert: {
    pointerEvents: "none",
    position: "absolute",
    top: theme.spaceXl,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    paddingHorizontal: theme.spaceLg,
    paddingVertical: theme.spaceSm,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.trackYellow,
  },
  alertTxt: { ...theme.typeKicker, fontSize: 14, color: theme.textOnYellow },
  countdown: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownTxt: {
    fontSize: 96,
    fontWeight: "900",
    color: theme.text,
    ...Platform.select({
      web: { textShadow: "0px 4px 12px rgba(0, 0, 0, 0.6)" },
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.6)",
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 12,
      },
    }),
  },

  padStrip: {
    pointerEvents: "none",
    minHeight: PAD_STRIP_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: theme.spaceSm,
  },
  // Each cell is a quarter of the width — exactly the touch zone for its pad.
  padCell: { flex: 1, alignItems: "center" },
  pad: {
    width: "86%",
    maxWidth: 140,
    height: 72,
    borderRadius: theme.radiusLg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  padActive: { backgroundColor: theme.trackOrange, borderColor: theme.trackOrangeHover },
  padBrake: { backgroundColor: theme.accentPressed, borderColor: theme.accent },
  padGas: { backgroundColor: theme.trackGreen, borderColor: theme.ownedBorder },
  padLabel: { ...theme.typeKicker, fontSize: 10, color: theme.textSecondary, marginTop: 2 },

  resultScrim: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spaceXl,
    backgroundColor: "rgba(5, 13, 26, 0.78)",
  },
  resultCard: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: theme.spaceXs,
    padding: theme.spaceXl,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    ...theme.shadow.card,
  },
  resultTitle: { ...theme.typeTitleLg, color: theme.text, marginTop: theme.spaceSm },
  resultCar: { fontSize: 14, fontWeight: "600", color: theme.textSecondary },
  resultRows: { alignSelf: "stretch", marginTop: theme.spaceLg, gap: theme.spaceSm },
  resultRow: { flexDirection: "row", alignItems: "center", gap: theme.spaceSm },
  resultLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.textSecondary },
  resultValue: { fontSize: 17, fontWeight: "900", color: theme.text, fontVariant: ["tabular-nums"] },
  recordPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.accentYellowMuted,
  },
  recordTxt: { fontSize: 11, fontWeight: "800", color: theme.trackYellow, letterSpacing: 0.4 },
  resultActions: { alignSelf: "stretch", gap: theme.spaceSm, marginTop: theme.spaceXl },
});
