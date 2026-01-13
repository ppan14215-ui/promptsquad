// Shadow layer type for react-native-shadow-2
export type ShadowLayer = {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
};

export type ShadowStyle = {
  layers: ShadowLayer[];
};

// Helper to create rgba string
const rgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const shadows = {
  xs: {
    layers: [
      { x: 0, y: 1, blur: 2, spread: 0, color: '#0A0D12', opacity: 0.05 },
    ],
  },
  sm: {
    layers: [
      { x: 0, y: 1, blur: 2, spread: -1, color: '#0A0D12', opacity: 0.1 },
      { x: 0, y: 1, blur: 3, spread: 0, color: '#0A0D12', opacity: 0.1 },
    ],
  },
  md: {
    layers: [
      { x: 0, y: 1.4, blur: 1.3, spread: 0, color: '#5B5B5B', opacity: 0.15 },
      { x: 0, y: 16, blur: 40, spread: 0, color: '#000000', opacity: 0.02 },
      { x: 0, y: 8, blur: 8, spread: 0, color: '#4E4E4E', opacity: 0.04 },
    ],
  },
  lg: {
    layers: [
      { x: 0, y: 12, blur: 16, spread: -4, color: '#0A0D12', opacity: 0.08 },
      { x: 0, y: 4, blur: 6, spread: -2, color: '#0A0D12', opacity: 0.03 },
      { x: 0, y: 2, blur: 2, spread: -1, color: '#0A0D12', opacity: 0.04 },
    ],
  },
  xl: {
    layers: [
      { x: 0, y: 20, blur: 24, spread: -4, color: '#0A0D12', opacity: 0.08 },
      { x: 0, y: 8, blur: 8, spread: -4, color: '#0A0D12', opacity: 0.03 },
      { x: 0, y: 3, blur: 3, spread: -1.5, color: '#0A0D12', opacity: 0.04 },
    ],
  },
  '2xl': {
    layers: [
      { x: 0, y: 24, blur: 48, spread: -12, color: '#0A0D12', opacity: 0.18 },
      { x: 0, y: 4, blur: 4, spread: -2, color: '#0A0D12', opacity: 0.04 },
    ],
  },
  '3xl': {
    layers: [
      { x: 0, y: 32, blur: 64, spread: -12, color: '#0A0D12', opacity: 0.14 },
      { x: 0, y: 5, blur: 5, spread: -2.5, color: '#0A0D12', opacity: 0.04 },
    ],
  },
} as const;

export type ShadowName = keyof typeof shadows;

// Skeuomorphic effects with inset shadows
export type InsetLayer = {
  y: number;
  blur: number;
  color: string;
  opacity: number;
};

export type SkeuomorphicStyle = {
  insetTop: InsetLayer;
  insetBottom: InsetLayer;
  outerShadow: ShadowName;
};

export const skeuomorphicEffects = {
  'skeu-primary-m': {
    insetTop: { y: 2, blur: 0, color: '#FFFFFF', opacity: 0.10 },
    insetBottom: { y: -2.5, blur: 0, color: '#2F2777', opacity: 0.30 },
    outerShadow: 'md' as ShadowName,
  },
  'skeu-primary-xs': {
    insetTop: { y: 2, blur: 0, color: '#FFFFFF', opacity: 0.10 },
    insetBottom: { y: -2, blur: 0, color: '#2F2777', opacity: 0.40 },
    outerShadow: 'md' as ShadowName,
  },
  'skeu-dark-m': {
    insetTop: { y: 2, blur: 0, color: '#FFFFFF', opacity: 0.10 },
    insetBottom: { y: -2.5, blur: 0, color: '#1C1C1C', opacity: 0.30 },
    outerShadow: 'md' as ShadowName,
  },
} as const;

export type SkeuomorphicName = keyof typeof skeuomorphicEffects;

// Convert to CSS box-shadow string (for web)
export function shadowToCSS(shadowName: ShadowName): string {
  const shadow = shadows[shadowName];
  return shadow.layers
    .map((l) => `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${rgba(l.color, l.opacity)}`)
    .join(', ');
}

// Convert skeuomorphic effect to full CSS box-shadow (web)
export function skeuToCSS(skeuName: SkeuomorphicName): string {
  const skeu = skeuomorphicEffects[skeuName];
  const outer = shadowToCSS(skeu.outerShadow);
  const insetTop = `0 ${skeu.insetTop.y}px ${skeu.insetTop.blur}px 0 ${rgba(skeu.insetTop.color, skeu.insetTop.opacity)} inset`;
  const insetBottom = `0 ${skeu.insetBottom.y}px ${skeu.insetBottom.blur}px 0 ${rgba(skeu.insetBottom.color, skeu.insetBottom.opacity)} inset`;
  return `${insetTop}, ${insetBottom}, ${outer}`;
}

// Get gradient colors for native inset approximation
export function skeuToGradient(skeuName: SkeuomorphicName) {
  const skeu = skeuomorphicEffects[skeuName];
  return {
    topColor: rgba(skeu.insetTop.color, skeu.insetTop.opacity),
    bottomColor: rgba(skeu.insetBottom.color, skeu.insetBottom.opacity),
    outerShadow: skeu.outerShadow,
  };
}

// Get first layer for native fallback (iOS/Android basic shadow)
export function shadowToNative(shadowName: ShadowName) {
  const layer = shadows[shadowName].layers[0];
  return {
    shadowColor: layer.color,
    shadowOffset: { width: layer.x, height: layer.y },
    shadowOpacity: layer.opacity,
    shadowRadius: layer.blur / 2,
    elevation: Math.round(layer.y + layer.blur / 2), // Android approximation
  };
}

