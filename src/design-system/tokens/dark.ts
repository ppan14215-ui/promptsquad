export const darkColors = {
  // Mascot colors (using light variants for dark mode visibility)
  yellow: '#F1E4A0',
  red: '#F3ACAF',
  green: '#CCDFC6',
  pink: '#EBC7D6',
  purple: '#9AAAEE',
  darkPurple: '#B5B2CD',
  brown: '#C0B6A0',
  teal: '#B7E0D6',
  orange: '#EBBF9C',
  blue: '#A6C5FA',
  // Mascot colors (light variants - same in dark mode)
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
  text: '#FAFAFA',
  textMuted: '#B4B4B4',
  icon: '#838383',
  background: '#1D1D1D',
  surface: '#212121',
  chatBubble: '#3C3C3C',
  buttonText: '#FFFFFF',
  hover: '#FFFFFF',
  outline: '#3E3E3E',
  primary: '#5A47D3',
  primaryBg: '#5A47D3',
  primaryHover: '#2F2777',
  darkButton: '#323232',
  darkButtonHover: '#1B1B1B',
} as const;

export type DarkColors = typeof darkColors;

