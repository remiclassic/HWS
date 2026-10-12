import { memo } from "react";
import Svg, { Path, Rect } from "react-native-svg";

type Props = {
  paint: string;
  /** Rendered length in px; the sprite keeps a 22:12 footprint. */
  length: number;
};

/** Die-cast seen from above, nose pointing right (heading 0). */
export const TopDownCar = memo(function TopDownCar({ paint, length }: Props) {
  return (
    <Svg width={length} height={(length * 24) / 44} viewBox="0 0 44 24">
      {/* wheels */}
      <Rect x={6} y={0} width={9} height={5} rx={1.5} fill="#0A0F14" />
      <Rect x={29} y={0} width={9} height={5} rx={1.5} fill="#0A0F14" />
      <Rect x={6} y={19} width={9} height={5} rx={1.5} fill="#0A0F14" />
      <Rect x={29} y={19} width={9} height={5} rx={1.5} fill="#0A0F14" />
      {/* body */}
      <Path
        d="M5 3.5 H33 Q43 5 43 12 Q43 19 33 20.5 H5 Q1 20.5 1 16.5 V7.5 Q1 3.5 5 3.5 Z"
        fill={paint}
        stroke="#0A0F14"
        strokeWidth={1.2}
      />
      {/* racing stripe */}
      <Rect x={2} y={10.5} width={40} height={3} fill="rgba(255,255,255,0.55)" />
      {/* windshield + rear glass */}
      <Path d="M25 6 Q31 7.5 31 12 Q31 16.5 25 18 Z" fill="#0A1A30" />
      <Path d="M12 6.5 Q9 8 9 12 Q9 16 12 17.5 Z" fill="#0A1A30" />
      {/* roof */}
      <Rect x={12.5} y={6.5} width={12} height={11} rx={2} fill="rgba(0,0,0,0.18)" />
    </Svg>
  );
});
