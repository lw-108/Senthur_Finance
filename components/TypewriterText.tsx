import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { theme } from '../theme';

export interface TypewriterTextProps {
  /**
   * Pre-split grapheme units array.
   *
   * Tamil Grapheme Logic Explanation:
   * Tamil script relies on complex combining characters where dependent vowels
   * (e.g. ா, ி, ு, ோ) and virama (pulli ்) attach directly to consonant bases (க, ச, த).
   * Using standard JavaScript string slicing (`string.slice`) splits by UTF-16 code units,
   * which strips diacritics from their consonant roots, causing broken floating glyphs.
   * By providing pre-composed grapheme units (e.g., ["வ", "ழ", "க", " ", "வ", "ள", "ம", "ட", "ன"]),
   * each complete glyph appears in one atomic rendering step.
   */
  units?: string[];
  typeSpeed?: number;
  eraseSpeed?: number;
  pauseDuration?: number;
  loop?: boolean;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  cursorColor?: string;
  delayStart?: number;
}

const DEFAULT_TAMIL_UNITS = ["வ", "ழ", "க", " ", "வ", "ள", "ம", "ட", "ன"];

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  units = DEFAULT_TAMIL_UNITS,
  typeSpeed = 140,
  eraseSpeed = 70,
  pauseDuration = 1800,
  loop = true,
  style,
  containerStyle,
  cursorColor = theme.colors.accentGold,
  delayStart = 400,
}) => {
  const [displayedUnitsCount, setDisplayedUnitsCount] = useState<number>(0);
  const cursorOpacity = useRef(new Animated.Value(1));

  // Blinking cursor animation: loops opacity 1 -> 0 every 500ms
  useEffect(() => {
    const cursorAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    cursorAnimation.start();

    return () => {
      cursorAnimation.stop();
    };
  }, [cursorOpacity]);

  // Grapheme-by-grapheme typing and erasing state machine
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;
    let state: 'typing' | 'pausing' | 'erasing' = 'typing';
    let currentCount = 0;

    const tick = () => {
      if (!isMounted) return;

      if (state === 'typing') {
        if (currentCount < units.length) {
          currentCount++;
          setDisplayedUnitsCount(currentCount);
          timeoutId = setTimeout(tick, typeSpeed);
        } else {
          // Finished typing full text; pause before erasing
          state = 'pausing';
          timeoutId = setTimeout(() => {
            if (!isMounted) return;
            if (loop) {
              state = 'erasing';
              timeoutId = setTimeout(tick, eraseSpeed);
            }
          }, pauseDuration);
        }
      } else if (state === 'erasing') {
        if (currentCount > 0) {
          currentCount--;
          setDisplayedUnitsCount(currentCount);
          timeoutId = setTimeout(tick, eraseSpeed);
        } else {
          // Fully erased; switch back to typing after small pause
          state = 'typing';
          timeoutId = setTimeout(tick, typeSpeed);
        }
      }
    };

    // Initial delay before starting the typewriter
    timeoutId = setTimeout(tick, delayStart);

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [units, typeSpeed, eraseSpeed, pauseDuration, loop, delayStart]);

  const currentText = units.slice(0, displayedUnitsCount).join('');

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.tamilText, style]}>
        {currentText}
      </Text>
      <Animated.Text
        style={[
          styles.cursor,
          {
            opacity: cursorOpacity,
            color: cursorColor,
          },
        ]}
      >
        |
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34, // Fixed minHeight so layout doesn't jump while typing
  },
  tamilText: {
    fontFamily: theme.typography.fontTamil,
    fontSize: theme.typography.tamilSize,
    fontWeight: '600',
    color: theme.colors.accentGold,
    textAlign: 'center',
  },
  cursor: {
    fontSize: theme.typography.tamilSize + 2,
    fontWeight: '300',
    marginLeft: 2,
    marginTop: -2,
  },
});

export default TypewriterText;
