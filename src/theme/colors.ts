// Dynamic Engine-Specific Theme Color Palettes
// ListenFree -> Electric Blue (#00D2FF / #007AFF)
// Freefy     -> Vibrant Green (#00E676 / #10B981)
// TuneFree   -> Radiant Red   (#FF3B6D / #FF4757)

export interface ThemeColors {
  primary: string;
  primaryGradient: [string, string];
  dialGradient: [string, string, string];
  secondary: string;
  accent: string;
  background: string;
  backgroundSecondary: string;
  card: string;
  cardGlass: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderActive: string;
  error: string;
  success: string;
  warning: string;
  live: string;
  surfaceGlow: string;
  tabBarBg: string;
  miniPlayerBg: string;
  sliderTrack: string;
  sliderProgress: string;
  badgeBg: string;
}

export const listenFreeColors: ThemeColors = {
  primary: '#00D2FF',
  primaryGradient: ['#00D2FF', '#007AFF'],
  dialGradient: ['#00D2FF', '#007AFF', '#38E1FF'],
  secondary: '#7F8FF4',
  accent: '#38E1FF',
  background: '#070A12',
  backgroundSecondary: '#0C111E',
  card: '#101726',
  cardGlass: 'rgba(16, 23, 38, 0.82)',
  cardBorder: 'rgba(0, 210, 255, 0.12)',
  text: '#FFFFFF',
  textSecondary: '#8CA0BA',
  textMuted: '#586A82',
  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: '#00D2FF',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  live: '#00D2FF',
  surfaceGlow: 'rgba(0, 210, 255, 0.38)',
  tabBarBg: 'rgba(12, 17, 30, 0.94)',
  miniPlayerBg: 'rgba(14, 20, 36, 0.95)',
  sliderTrack: 'rgba(255, 255, 255, 0.12)',
  sliderProgress: '#00D2FF',
  badgeBg: 'rgba(0, 210, 255, 0.18)',
};

export const freefyColors: ThemeColors = {
  primary: '#00E676',
  primaryGradient: ['#00E676', '#10B981'],
  dialGradient: ['#00E676', '#10B981', '#6EE7B7'],
  secondary: '#34D399',
  accent: '#A7F3D0',
  background: '#060E0A',
  backgroundSecondary: '#0B1812',
  card: '#10221A',
  cardGlass: 'rgba(16, 34, 26, 0.82)',
  cardBorder: 'rgba(0, 230, 118, 0.12)',
  text: '#FFFFFF',
  textSecondary: '#8BAAA0',
  textMuted: '#58736B',
  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: '#00E676',
  error: '#F87171',
  success: '#00E676',
  warning: '#FBBF24',
  live: '#00E676',
  surfaceGlow: 'rgba(0, 230, 118, 0.38)',
  tabBarBg: 'rgba(11, 24, 18, 0.94)',
  miniPlayerBg: 'rgba(13, 28, 21, 0.95)',
  sliderTrack: 'rgba(255, 255, 255, 0.12)',
  sliderProgress: '#00E676',
  badgeBg: 'rgba(0, 230, 118, 0.18)',
};

export const tuneFreeColors: ThemeColors = {
  primary: '#FF3B6D',
  primaryGradient: ['#FF3B6D', '#FF758C'],
  dialGradient: ['#FF3B6D', '#FF758C', '#FFA07A'],
  secondary: '#FF6B81',
  accent: '#FFA502',
  background: '#0C080E',
  backgroundSecondary: '#160F1A',
  card: '#201524',
  cardGlass: 'rgba(32, 21, 36, 0.82)',
  cardBorder: 'rgba(255, 59, 109, 0.12)',
  text: '#FFFFFF',
  textSecondary: '#B096A8',
  textMuted: '#7A6273',
  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: '#FF3B6D',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  live: '#FF3B6D',
  surfaceGlow: 'rgba(255, 59, 109, 0.38)',
  tabBarBg: 'rgba(22, 15, 26, 0.94)',
  miniPlayerBg: 'rgba(26, 18, 31, 0.95)',
  sliderTrack: 'rgba(255, 255, 255, 0.12)',
  sliderProgress: '#FF3B6D',
  badgeBg: 'rgba(255, 59, 109, 0.18)',
};

