import { memo } from "react";
import { Image, type ImageStyle } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "../../lib/theme";

type Props = {
  uri: string | null | undefined;
  /** Layout + border; matches list thumbnails in catalog screens. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Remote thumbnail with cache + fade-in; empty `uri` renders a neutral placeholder. */
export const RemoteImage = memo(function RemoteImage({ uri, style, accessibilityLabel }: Props) {
  if (!uri) {
    return (
      <View
        style={[styles.placeholder, style]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style as StyleProp<ImageStyle>}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
});

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.bgSubtle,
  },
});
