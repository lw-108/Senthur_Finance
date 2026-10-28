import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
} from 'react-native-svg';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';

export interface DataPoint {
  label: string;
  value: number;
  displayValue?: string;
}

interface AreaChartWrapperProps {
  data: DataPoint[];
  height?: number;
  width?: number;
  chartColor?: string;
  gradientStartOpacity?: number;
  gradientEndOpacity?: number;
  currencyPrefix?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function AreaChartWrapper({
  data,
  height = 190,
  width = SCREEN_WIDTH - 40,
  chartColor,
  gradientStartOpacity = 0.45,
  gradientEndOpacity = 0.02,
  currencyPrefix = '₹',
}: AreaChartWrapperProps) {
  const { colors: dynamicColors } = useTheme();
  const activeColor = chartColor || dynamicColors.primary;

  const [selectedIndex, setSelectedIndex] = useState<number>(
    data.length > 0 ? Math.floor(data.length / 2) : 0
  );

  if (!data || data.length < 2) {
    return null;
  }

  const paddingTop = 24;
  const paddingBottom = 28;
  const paddingHorizontal = 16;

  const chartInnerWidth = width - paddingHorizontal * 2;
  const chartInnerHeight = height - paddingTop - paddingBottom;

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Calculate coordinates for points
  const points = data.map((d, index) => {
    const x = paddingHorizontal + (index / (data.length - 1)) * chartInnerWidth;
    const y =
      paddingTop +
      chartInnerHeight -
      ((d.value - minValue) / range) * chartInnerHeight;
    return { x, y, data: d };
  });

  // Construct smooth SVG Bézier path
  const createSmoothPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      // Catmull-Rom to Cubic Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePath = createSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    paddingTop + chartInnerHeight
  } L ${points[0].x} ${paddingTop + chartInnerHeight} Z`;

  const activePoint = points[selectedIndex] || points[0];

  // Pan responder to track finger drag along chart
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => handleTouch(evt),
    onPanResponderMove: (evt) => handleTouch(evt),
  });

  const handleTouch = (evt: GestureResponderEvent) => {
    const touchX = evt.nativeEvent.locationX;
    let closestIndex = 0;
    let minDistance = Infinity;

    points.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - touchX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    setSelectedIndex(closestIndex);
  };

  return (
    <View style={[styles.container, { width, height }]} {...panResponder.panHandlers}>
      {/* Floating Black Pill Tooltip */}
      {activePoint && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              left: Math.min(
                Math.max(activePoint.x - 48, 10),
                width - 105
              ),
              top: Math.max(activePoint.y - 44, 4),
            },
          ]}
        >
          <Text style={styles.tooltipValue}>
            {activePoint.data.displayValue ||
              `${currencyPrefix}${activePoint.data.value.toLocaleString('en-IN')}`}
          </Text>
          <Text style={styles.tooltipTime}>{activePoint.data.label}</Text>
        </View>
      )}

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={activeColor} stopOpacity={gradientStartOpacity} />
            <Stop offset="100%" stopColor={activeColor} stopOpacity={gradientEndOpacity} />
          </LinearGradient>
        </Defs>

        {/* Shaded Area */}
        <Path d={areaPath} fill="url(#chartGradient)" />

        {/* Top Smooth Line */}
        <Path
          d={linePath}
          fill="none"
          stroke={activeColor}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Dashed Crosshairs */}
        {activePoint && (
          <>
            {/* Vertical dashed line */}
            <Line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={paddingTop + chartInnerHeight}
              stroke={activeColor}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            {/* Horizontal dashed line */}
            <Line
              x1={paddingHorizontal}
              y1={activePoint.y}
              x2={width - paddingHorizontal}
              y2={activePoint.y}
              stroke={dynamicColors.primaryLight}
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {/* Dynamic Dot Marker */}
            <Circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={7}
              fill={activeColor}
              stroke="#FFFFFF"
              strokeWidth={3}
            />
          </>
        )}
      </Svg>

      {/* Time / Category Labels at Bottom */}
      <View style={[styles.labelsRow, { paddingHorizontal }]}>
        {data.map((item, idx) => {
          // Show only every Nth label if there are many points
          const isSelected = idx === selectedIndex;
          return (
            <Text
              key={idx}
              style={[
                styles.timeLabel,
                { color: dynamicColors.textTertiary },
                isSelected && [styles.timeLabelSelected, { color: activeColor }],
              ]}
            >
              {item.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 12,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#111111',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltipValue: {
    fontFamily: typography.fontPolymath,
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 0.9,
  },
  tooltipTime: {
    fontFamily: typography.fontPolymathThin,
    color: '#A0A0A8',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
  },
  timeLabel: {
    fontFamily: typography.fontPolymathThin,
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  timeLabelSelected: {
    fontFamily: typography.fontPolymath,
    color: colors.ink,
    letterSpacing: 0.9,
  },
});
