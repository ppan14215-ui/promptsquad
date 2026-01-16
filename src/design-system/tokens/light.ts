export const lightColors = {
  // Mascot colors (primary)
  yellow: '#EDB440',
  red: '#E64140',
  green: '#74AE58',
  pink: '#EB3F71',
  purple: '#5E24CB',
  darkPurple: '#2D2E66',
  brown: '#826F57',
  teal: '#59C19D',
  orange: '#ED7437',
  blue: '#2D6CF5',
  // Mascot colors (light variants)
  yellowLight: '#F1E4A0',
  redLight: '#F3ACAF',
  greenLight: '#CCDFC6',
  pinkLight: '#EBC7D6',
  purpleLight: '#9AAAEE',
  darkPurpleLight: '#B5B2CD',
  brownLight: '#C0B6A0',
  tealLight: '#B7E0D6',
  orangeLight: '#EBBF9C',
  blueLight: '#A6C5FA',
  // Text colors
  text: '#212121',
  textMuted: '#898989',
  icon: '#A4A7AE',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  chatBubble: '#F5F5F5',
  buttonText: '#FFFFFF',
  hover: '#FAFAFA',
  outline: '#D9D9D9',
  primary: '#3F31B4',
  primaryBg: '#E0DFEA',
  primaryHover: '#2F2777',
  darkButton: '#323232',
  darkButtonHover: '#1B1B1B',
} as const;

export type LightColors = typeof lightColors;

