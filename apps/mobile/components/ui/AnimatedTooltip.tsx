import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { Pressable, View, type LayoutRectangle, type StyleProp, type ViewStyle } from "react-native";
import { TooltipModal } from "./TooltipModal";

type Props = {
  children: ReactNode;
  title: string;
  detail?: string;
  /** Widen the long-press target (e.g. full-width confidence bar) */
  anchorStyle?: StyleProp<ViewStyle>;
};

/** Long-press to show the same tooltip surface as filter pills (press-only on filters). */
export const AnimatedTooltip = memo(function AnimatedTooltip({
  children,
  title,
  detail,
  anchorStyle,
}: Props) {
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle>({ x: 0, y: 0, width: 0, height: 0 });

  const present = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, []);

  const dismiss = useCallback(() => setOpen(false), []);

  return (
    <View ref={anchorRef} collapsable={false} style={anchorStyle}>
      <Pressable
        onLongPress={present}
        delayLongPress={380}
        accessibilityHint={`Long-press for tip: ${title}`}
      >
        {children}
      </Pressable>
      <TooltipModal visible={open} anchor={anchor} title={title} detail={detail} onDismiss={dismiss} />
    </View>
  );
});
