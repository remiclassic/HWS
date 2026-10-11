import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
  type ViewToken,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { theme } from "../../lib/theme";

type Slide = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tint: string;
  title: string;
  body: string;
  kicker?: string;
};

const SLIDES: Slide[] = [
  {
    icon: "car-search-outline",
    tint: theme.accentSecondary,
    kicker: "Welcome, collector",
    title: "The whole aisle — in your pocket",
    body: "Hunt Mainline, Premium, RLC, and every Treasure Hunt level with filters that snap. Tap a casting and go deep on wheels, deco, and intel before you buy or trade.",
  },
  {
    icon: "garage-variant",
    tint: theme.trackOrange,
    kicker: "Your garage",
    title: "Own every pull",
    body: "Log owned, want, and dupes in seconds. This profile starts on-device — add an email in Settings whenever you're ready and your garage rolls with you to the next phone.",
  },
  {
    icon: "shield-check-outline",
    tint: theme.success,
    kicker: "You're in control",
    title: "Camera & alerts — only when you say so",
    body: "We wake the camera when you open Scan — nowhere else. Want-list buzz? Flip it on in Settings. No surprise pop-ups, no nagging.",
  },
  {
    icon: "flag-checkered",
    tint: theme.trackYellow,
    kicker: "Green light",
    title: "Let's hit the pegs",
    body: "You're set. Dig the catalog, stack your garage, and chase the next big score. See you out there.",
  },
];

/** Space reserved for absolute footer (dots + CTA) so copy stays visually centered above it. */
const FOOTER_RESERVE = 148;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const { completeIntro } = useOnboarding();
  const listRef = useRef<FlatList>(null);
  const [page, setPage] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const i = viewableItems[0]?.index;
      if (typeof i === "number") setPage(i);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const goNext = useCallback(() => {
    if (page < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: page + 1, animated: true });
    } else {
      void completeIntro();
    }
  }, [page, completeIntro]);

  const renderItem: ListRenderItem<Slide> = useCallback(
    ({ item }) => (
      <View style={[styles.slide, { width, height: windowHeight }]}>
        <LinearGradient
          colors={theme.heroWashGradientColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.slideContent,
            {
              paddingTop: insets.top + 12,
              paddingBottom: FOOTER_RESERVE + insets.bottom,
            },
          ]}
        >
          <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.slideInner}>
            <View style={[styles.iconRing, { borderColor: item.tint + "55" }]}>
              <View style={[styles.iconDisc, { backgroundColor: item.tint + "22" }]}>
                <MaterialCommunityIcons name={item.icon} size={56} color={item.tint} />
              </View>
            </View>
            {item.kicker ? <Text style={styles.kicker}>{item.kicker}</Text> : null}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </Animated.View>
        </View>
      </View>
    ),
    [width, windowHeight, insets.top, insets.bottom],
  );

  const onScrollToIndexFailed = useCallback((info: { index: number }) => {
    const wait = new Promise((r) => setTimeout(r, 400));
    void wait.then(() => {
      listRef.current?.scrollToIndex({ index: info.index, animated: true });
    });
  }, []);

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const x = e.nativeEvent.contentOffset.x;
          setPage(Math.round(x / Math.max(width, 1)));
        }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton label={page < SLIDES.length - 1 ? "Next" : "Get started"} onPress={goNext} />
      </View>
      {page < SLIDES.length - 1 ? (
        <Pressable
          onPress={() => void completeIntro()}
          style={[styles.skip, { top: insets.top + theme.spaceSm }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Skip intro"
        >
          <Text style={styles.skipTxt}>Skip</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  list: { flex: 1 },
  slide: {
    position: "relative",
  },
  slideContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spaceLg,
  },
  slideInner: { maxWidth: 420, width: "100%", alignItems: "center" },
  iconRing: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space2xl,
  },
  iconDisc: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  skip: {
    position: "absolute",
    right: theme.spaceLg,
    minHeight: theme.touchTargetMin,
    paddingHorizontal: theme.spaceSm,
    justifyContent: "center",
  },
  skipTxt: { fontSize: 16, fontWeight: "700", color: theme.textSecondary },
  kicker: {
    ...theme.typeKicker,
    color: theme.trackYellow,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: theme.text,
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: theme.spaceMd,
    textAlign: "center",
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    color: theme.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spaceLg,
    gap: theme.spaceLg,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.border,
  },
  dotActive: { backgroundColor: theme.text, width: 22 },
});
