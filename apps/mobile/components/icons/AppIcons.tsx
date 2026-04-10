import { memo } from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

export type IconProps = {
  color: string;
  size?: number;
};

/** Tab: stylized car + magnifier (Spotter) */
export const IconSpotterTab = memo(function IconSpotterTab({ color, size = 24 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 14.5v-1.2c0-.9.6-1.7 1.5-1.9l1.4-.4.9-2.6c.3-.8 1-1.4 1.9-1.4h5.6c.9 0 1.6.6 1.9 1.4l.9 2.6 1.4.4c.9.2 1.5 1 1.5 1.9v1.2"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7} cy={14.5} r={1.35} stroke={color} strokeWidth={1.65} />
      <Circle cx={17} cy={14.5} r={1.35} stroke={color} strokeWidth={1.65} />
      <Line x1={5.5} y1={14.5} x2={8.5} y2={14.5} stroke={color} strokeWidth={1.65} />
      <Line x1={15.5} y1={14.5} x2={18.5} y2={14.5} stroke={color} strokeWidth={1.65} />
      <Circle cx={17.25} cy={7.75} r={3.25} stroke={color} strokeWidth={1.65} />
      <Line x1={19.6} y1={10.1} x2={21.25} y2={11.75} stroke={color} strokeWidth={1.65} strokeLinecap="round" />
    </Svg>
  );
});

/** Tab: garage / collection */
export const IconGarageTab = memo(function IconGarageTab({ color, size = 24 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 21v-6h6v6"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x={11} y={12} width={2} height={2} rx={0.4} fill={color} />
    </Svg>
  );
});

/** Header: barcode scanner */
export const IconBarcodeScan = memo(function IconBarcodeScan({ color, size = 26 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2m10-16h2a1 1 0 0 1 1 1v2m0 10v2a1 1 0 0 1-1 1h-2"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
      />
      <Line x1={8} y1={8} x2={8} y2={16} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Line x1={10.5} y1={7} x2={10.5} y2={17} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Line x1={13} y1={8.5} x2={13} y2={15.5} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Line x1={15.5} y1={7} x2={15.5} y2={17} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Line x1={18} y1={9} x2={18} y2={15} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
});

/** Filters row: vertical sliders */
export const IconFilterSliders = memo(function IconFilterSliders({ color, size = 22 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Line x1={6} y1={5} x2={6} y2={19} stroke={color} strokeWidth={1.65} strokeLinecap="round" />
      <Line x1={6} y1={9} x2={10} y2={9} stroke={color} strokeWidth={1.65} strokeLinecap="round" />
      <Circle cx={6} cy={9} r={2.25} stroke={color} strokeWidth={1.65} />
      <Line x1={12} y1={5} x2={12} y2={19} stroke={color} strokeWidth={1.65} strokeLinecap="round" />
      <Line x1={12} y1={15} x2={16} y2={15} stroke={color} strokeWidth={1.65} strokeLinecap="round" />
      <Circle cx={12} cy={15} r={2.25} stroke={color} strokeWidth={1.65} />
      <Line x1={18} y1={5} x2={18} y2={19} stroke={color} strokeWidth={1.65} strokeLinecap="round" />
      <Line x1={18} y1={7} x2={14} y2={7} stroke={color} strokeWidth={1.65} strokeLinecap="round" />
      <Circle cx={18} cy={7} r={2.25} stroke={color} strokeWidth={1.65} />
    </Svg>
  );
});

export const IconChevronDown = memo(function IconChevronDown({ color, size = 22 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const IconChevronUp = memo(function IconChevronUp({ color, size = 22 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path d="M6 15l6-6 6 6" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/** Export / share */
export const IconShareExport = memo(function IconShareExport({ color, size = 24 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v10m0 0 3.5-3.5M12 14 8.5 10.5"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 14v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

/** Empty state: search */
export const IconCarSearchLarge = memo(function IconCarSearchLarge({ color, size = 40 }: IconProps) {
  return <IconSpotterTab color={color} size={size} />;
});

/** Error banner */
export const IconPencil = memo(function IconPencil({ color, size = 22 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

export const IconTrash = memo(function IconTrash({ color, size = 22 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6h14ZM10 11v6M14 11v6"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

export const IconPackage = memo(function IconPackage({ color, size = 44 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

export const IconCloudOff = memo(function IconCloudOff({ color, size = 20 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 17h.8a2.7 2.7 0 0 0 .5-5.35 3.6 3.6 0 0 0-6.75-1.1A4.4 4.4 0 0 0 6 12.5c0 .2 0 .4.05.6"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 19 19 4"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
      />
    </Svg>
  );
});
