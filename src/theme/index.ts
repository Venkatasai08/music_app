// Theme Master Module

import { listenFreeColors, freefyColors, tuneFreeColors, ThemeColors } from './colors';
import { typography } from './typography';
import { spacing, radius, glassmorphism } from './layout';
import { useEngineStore } from '../stores/useEngineStore';

export * from './colors';
export * from './typography';
export * from './layout';

export const getEngineTheme = (engine?: string | null): ThemeColors => {
  if (engine === 'freefy') return freefyColors;
  if (engine === 'tune_free') return tuneFreeColors;
  return listenFreeColors;
};

export const useAppTheme = (): {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  glassmorphism: typeof glassmorphism;
  isListenFree: boolean;
  isFreefy: boolean;
  isTuneFree: boolean;
} => {
  const activeEngine = useEngineStore((state) => state.activeEngine);
  const isListenFree = activeEngine === 'listen_free';
  const isFreefy = activeEngine === 'freefy';
  const isTuneFree = activeEngine === 'tune_free';

  const colors = getEngineTheme(activeEngine);

  return {
    colors,
    typography,
    spacing,
    radius,
    glassmorphism,
    isListenFree,
    isFreefy,
    isTuneFree,
  };
};

