export const fontFamilies = {
  figtree: {
    regular: 'Figtree_400Regular',
    medium: 'Figtree_500Medium',
    semiBold: 'Figtree_600SemiBold',
  },
  abyssinicaSil: {
    regular: 'AbyssinicaSIL_400Regular',
  },
} as const;

export const textStyles = {
  h1: {
    fontFamily: fontFamilies.figtree.semiBold,
    fontSize: 28,
    lineHeight: 28 * 1.3, // 130%
    letterSpacing: 0,
  },
  h2: {
    fontFamily: fontFamilies.figtree.semiBold,
    fontSize: 22,
    lineHeight: 22 * 1.3, // 130%
    letterSpacing: 0,
  },
  h3: {
    fontFamily: fontFamilies.figtree.semiBold,
    fontSize: 18,
    lineHeight: 18 * 1.3, // 130%
    letterSpacing: 0,
  },
  cardTitle: {
    fontFamily: fontFamilies.abyssinicaSil.regular,
    fontSize: 18,
    lineHeight: 18 * 1.3, // 130%
    letterSpacing: 18 * 0.02, // 2%
  },
  body: {
    fontFamily: fontFamilies.figtree.regular,
    fontSize: 14,
    lineHeight: 14 * 1.5, // 150%
    letterSpacing: 0,
  },
  message: {
    fontFamily: fontFamilies.figtree.semiBold,
    fontSize: 14,
    lineHeight: 14 * 1.3, // 130%
    letterSpacing: 0,
  },
  label: {
    fontFamily: fontFamilies.figtree.semiBold,
    fontSize: 12,
    lineHeight: undefined, // Auto
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: fontFamilies.figtree.medium,
    fontSize: 11,
    lineHeight: undefined, // Auto
    letterSpacing: 0.5,
  },
  caption: {
    fontFamily: fontFamilies.figtree.regular,
    fontSize: 11,
    lineHeight: 11 * 1.4, // 140%
    letterSpacing: 0,
  },
  button: {
    fontFamily: fontFamilies.figtree.semiBold,
    fontSize: 14,
    lineHeight: undefined, // Auto
    letterSpacing: 0,
  },
  miniButton: {
    fontFamily: fontFamilies.figtree.semiBold,
    fontSize: 10,
    fontWeight: '700' as const,
    lineHeight: 10, // 100%
    letterSpacing: 0.5,
  },
} as const;

export type TextStyleName = keyof typeof textStyles;
export type TextStyle = (typeof textStyles)[TextStyleName];

