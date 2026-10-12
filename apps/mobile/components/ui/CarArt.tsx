import { memo } from "react";
import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { carArtFor, spotterAssets } from "../../lib/spotterAssets";

type Props = {
  castingName: string | null | undefined;
  style?: StyleProp<ViewStyle>;
};

/** True when we ship studio art for this casting (used when the catalog has no image). */
export function hasCarArt(castingName: string | null | undefined): boolean {
  return carArtFor(castingName) != null;
}

/** Bundled car cutout parked on the workshop-table stage; renders nothing without art. */
export const CarArt = memo(function CarArt({ castingName, style }: Props) {
  const art = carArtFor(castingName);
  if (art == null) return null;
  return (
    <View style={[styles.stage, style]} accessibilityRole="image" accessibilityLabel={`${castingName} art`}>
      <Image
        source={spotterAssets.carStage}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
      />
      <Image source={art} style={styles.car} contentFit="contain" contentPosition="bottom" transition={150} />
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  // Wheels land on the table, which fills roughly the bottom third of the stage.
  car: {
    position: "absolute",
    left: "5%",
    right: "5%",
    top: "8%",
    bottom: "9%",
  },
});
