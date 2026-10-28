import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface PaginationProps {
  total?: number;
  activeIndex: number;
  style?: StyleProp<ViewStyle>;
  activeDotColor?: string;
  inactiveDotColor?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  total = 5,
  activeIndex,
  style,
  activeDotColor = theme.colors.activeDot,
  inactiveDotColor = theme.colors.inactiveDot,
}) => {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.dotBase,
              isActive
                ? [styles.activeDot, { backgroundColor: activeDotColor }]
                : [styles.inactiveDot, { backgroundColor: inactiveDotColor }],
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dotBase: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 16,
  },
  inactiveDot: {
    width: 6,
  },
});

export default Pagination;
