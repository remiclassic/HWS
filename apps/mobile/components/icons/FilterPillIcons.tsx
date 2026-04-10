import { memo, type ReactElement } from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import type { LineType, TreasureHuntType } from "@hotwheels/shared";

export type PillIconProps = { color: string; size?: number };

/** All product lines — layered cards */
export const IconLineAll = memo(function IconLineAll({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={6} width={14} height={9} rx={1.5} stroke={color} strokeWidth={1.5} />
      <Rect x={7} y={9} width={14} height={9} rx={1.5} stroke={color} strokeWidth={1.5} opacity={0.85} />
      <Rect x={9} y={12} width={14} height={9} rx={1.5} stroke={color} strokeWidth={1.5} opacity={0.7} />
    </Svg>
  );
});

/** Standard retail mainline */
export const IconLineMainline = memo(function IconLineMainline({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15.5v-1c0-.8.5-1.5 1.2-1.7l1-.3.7-2c.2-.6.8-1 1.4-1h4.4c.6 0 1.2.4 1.4 1l.7 2 1 .3c.7.2 1.2.9 1.2 1.7v1"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7.5} cy={15.5} r={1.2} stroke={color} strokeWidth={1.5} />
      <Circle cx={16.5} cy={15.5} r={1.2} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
});

/** Premium / Car Culture style */
export const IconLinePremium = memo(function IconLinePremium({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15.5v-1c0-.8.5-1.5 1.2-1.7l1-.3.7-2c.2-.6.8-1 1.4-1h4.4c.6 0 1.2.4 1.4 1l.7 2 1 .3c.7.2 1.2.9 1.2 1.7v1"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7.5} cy={15.5} r={1.2} stroke={color} strokeWidth={1.5} />
      <Circle cx={16.5} cy={15.5} r={1.2} stroke={color} strokeWidth={1.5} />
      <Path d="M8 7l2 2 4-4 3 3" stroke={color} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/** RLC — badge / rosette */
export const IconLineRlc = memo(function IconLineRlc({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={11} r={5.5} stroke={color} strokeWidth={1.5} />
      <Path
        d="M12 5.5v2M12 14.5v2M7.2 11h2M14.8 11h2M8.5 7.5l1.4 1.4M14.1 13.1l1.4 1.4M8.5 14.5l1.4-1.4M14.1 8.9l1.4-1.4"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
});

/** Hauler + car */
export const IconLineTeamTransport = memo(function IconLineTeamTransport({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 17.5h6.5v-4H3v4Zm2-4v-2.5c0-.5.4-1 1-1h2.5"
        stroke={color}
        strokeWidth={1.45}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={5} cy={17.5} r={1.1} stroke={color} strokeWidth={1.45} />
      <Path
        d="M12 17.5h9v-3l-1.5-3h-4L13 14.5h-1v3Z"
        stroke={color}
        strokeWidth={1.45}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={15} cy={17.5} r={1.1} stroke={color} strokeWidth={1.45} />
      <Circle cx={19} cy={17.5} r={1.1} stroke={color} strokeWidth={1.45} />
    </Svg>
  );
});

/** Entertainment — clapper */
export const IconLineEntertainment = memo(function IconLineEntertainment({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10h16v2H4V10Zm2 4h12v6H6v-6Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M6 10V8l2-2h10l2 2v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={8} y1={6} x2={10} y2={8} stroke={color} strokeWidth={1.2} />
      <Line x1={11} y1={5.5} x2={13} y2={7.5} stroke={color} strokeWidth={1.2} />
      <Line x1={14} y1={5.5} x2={16} y2={7.5} stroke={color} strokeWidth={1.2} />
    </Svg>
  );
});

/** Other / misc */
export const IconLineOther = memo(function IconLineOther({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Circle cx={6} cy={12} r={1.6} fill={color} />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
      <Circle cx={18} cy={12} r={1.6} fill={color} />
    </Svg>
  );
});

export function lineFilterIconFor(
  key: LineType | "all",
  color: string,
  size: number,
): ReactElement {
  const p = { color, size } as const;
  switch (key) {
    case "all":
      return <IconLineAll {...p} />;
    case "Mainline":
      return <IconLineMainline {...p} />;
    case "Premium":
      return <IconLinePremium {...p} />;
    case "RLC":
      return <IconLineRlc {...p} />;
    case "TeamTransport":
      return <IconLineTeamTransport {...p} />;
    case "Entertainment":
      return <IconLineEntertainment {...p} />;
    case "Other":
      return <IconLineOther {...p} />;
    default:
      return <IconLineOther {...p} />;
  }
}

/** Any hunt — dotted target */
export const IconHuntAny = memo(function IconHuntAny({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.45} strokeDasharray="3 3" />
      <Circle cx={12} cy={12} r={3.5} stroke={color} strokeWidth={1.45} />
      <Circle cx={12} cy={12} r={1.2} fill={color} />
    </Svg>
  );
});

/** Not TH — slash through flame hint */
export const IconHuntNone = memo(function IconHuntNone({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5c-2 3-4 4.5-4 7.5a4 4 0 0 0 8 0c0-1.5-.8-2.8-2-4.5"
        stroke={color}
        strokeWidth={1.45}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={6} y1={18} x2={18} y2={6} stroke={color} strokeWidth={1.45} strokeLinecap="round" />
    </Svg>
  );
});

/** Regular Treasure Hunt */
export const IconHuntTh = memo(function IconHuntTh({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.5c-1.5 2.5-4 5-4 8.5a4 4 0 0 0 8 0c0-2-1.2-3.8-2.5-5.5L12 4.5Z"
        stroke={color}
        strokeWidth={1.45}
        strokeLinejoin="round"
      />
    </Svg>
  );
});

/** Super Treasure Hunt — flame + star */
export const IconHuntSth = memo(function IconHuntSth({ color, size = 20 }: PillIconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5.5c-1.2 2-3.2 4-3.2 7a3.8 3.8 0 0 0 7.6 0c0-1.8-.9-3.2-2-4.8L11 5.5Z"
        stroke={color}
        strokeWidth={1.35}
        strokeLinejoin="round"
      />
      <Path
        d="M16.5 6.5 17.3 8l1.7.3-1.3 1.2.3 1.7-1.5-.9-1.5.9.3-1.7-1.3-1.2 1.7-.3.8-1.5Z"
        stroke={color}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    </Svg>
  );
});

export function huntFilterIconFor(
  key: TreasureHuntType | "all",
  color: string,
  size: number,
): ReactElement {
  const p = { color, size } as const;
  switch (key) {
    case "all":
      return <IconHuntAny {...p} />;
    case "None":
      return <IconHuntNone {...p} />;
    case "TH":
      return <IconHuntTh {...p} />;
    case "STH":
      return <IconHuntSth {...p} />;
    default:
      return <IconHuntAny {...p} />;
  }
}
