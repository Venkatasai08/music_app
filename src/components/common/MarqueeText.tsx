// Smooth 60fps Native Marquee Text Component for Song Titles & Artists

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
  Easing,
  ScrollView,
} from 'react-native';

interface MarqueeTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  speed?: number; // pixels per second (default 32)
  delay?: number; // ms to pause before starting (default 1500)
  spacing?: number; // gap between repeating text (default 48)
  active?: boolean;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  style,
  containerStyle,
  speed = 32,
  delay = 1500,
  spacing = 48,
  active = true,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const isRunningRef = useRef(false);

  // Reset text width on text prop change to ensure accurate re-measurement
  useEffect(() => {
    setTextWidth(0);
  }, [text]);

  const shouldAnimate = active && containerWidth > 0 && textWidth > containerWidth + 2;

  useEffect(() => {
    isRunningRef.current = false;
    animatedValue.stopAnimation();
    animatedValue.setValue(0);

    if (!shouldAnimate) return;

    const totalDistance = textWidth + spacing;
    const duration = Math.max(1000, (totalDistance / speed) * 1000);

    let isMounted = true;
    isRunningRef.current = true;

    const animateLoop = () => {
      if (!isMounted || !isRunningRef.current) return;

      animatedValue.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animatedValue, {
          toValue: -totalDistance,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && isMounted && isRunningRef.current) {
          animateLoop();
        }
      });
    };

    animateLoop();

    return () => {
      isMounted = false;
      isRunningRef.current = false;
      animatedValue.stopAnimation();
    };
  }, [text, shouldAnimate, textWidth, containerWidth, speed, delay, spacing]);

  return (
    <View
      style={[styles.container, containerStyle]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && Math.abs(w - containerWidth) > 1) {
          setContainerWidth(w);
        }
      }}
    >
      {/* Invisible measurement container: horizontal ScrollView allows infinite width layout */}
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.measureScrollView}
        pointerEvents="none"
      >
        <Text
          onLayout={(e) => {
            const w = Math.ceil(e.nativeEvent.layout.width);
            if (w > 0 && Math.abs(w - textWidth) > 1) {
              setTextWidth(w);
            }
          }}
          style={[style, styles.measureText]}
          numberOfLines={1}
        >
          {text}
        </Text>
      </ScrollView>

      {shouldAnimate ? (
        <Animated.View
          style={[
            styles.animatedRow,
            {
              transform: [{ translateX: animatedValue }],
            },
          ]}
        >
          <Text style={[style, styles.noWrapText]} numberOfLines={1}>
            {text}
          </Text>
          <View style={{ width: spacing }} />
          <Text style={[style, styles.noWrapText]} numberOfLines={1}>
            {text}
          </Text>
        </Animated.View>
      ) : (
        <Text style={style} numberOfLines={1}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
  animatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    alignSelf: 'flex-start',
  },
  noWrapText: {
    flexShrink: 0,
  },
  measureScrollView: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  measureText: {
    flexShrink: 0,
  },
});


