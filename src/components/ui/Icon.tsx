import React from 'react';
import type { SvgProps } from 'react-native-svg';
import { 
  Home01Icon, 
  UserIcon, 
  AddCircleIcon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  FavouriteIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SentIcon,
  Mic01Icon,
  StopIcon,
  Globe02Icon,
  Idea01Icon,
  Store01Icon,
  SquareLock02Icon,
  Edit02Icon,
  Delete02Icon,
  Add01Icon,
  Settings02Icon,
  type HugeiconsProps 
} from 'hugeicons-react-native';
import { FavouriteFilledIcon } from './FavouriteFilledIcon';

type IconComponent = React.ComponentType<HugeiconsProps | SvgProps>;

type NamedIcon = 'home' | 'user' | 'add-circle' | 'arrow-up-right' | 'close' | 'favourite' | 'favourite-filled' | 'arrow-left' | 'arrow-right' | 'send' | 'mic' | 'stop' | 'globe' | 'idea' | 'store' | 'lock' | 'edit' | 'delete' | 'add' | 'settings' | 'pin' | 'pin-filled';

type IconProps = {
  name?: NamedIcon;
  icon?: IconComponent;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const iconMap: Record<NamedIcon, IconComponent> = {
  home: Home01Icon,
  user: UserIcon,
  'add-circle': AddCircleIcon,
  'arrow-up-right': ArrowUpRight01Icon,
  'close': Cancel01Icon,
  'favourite': FavouriteIcon,
  'favourite-filled': FavouriteFilledIcon,
  'arrow-left': ArrowLeft01Icon,
  'arrow-right': ArrowRight01Icon,
  'send': SentIcon,
  'mic': Mic01Icon,
  'stop': StopIcon,
  'globe': Globe02Icon,
  'idea': Idea01Icon,
  'store': Store01Icon,
  'lock': SquareLock02Icon,
  'edit': Edit02Icon,
  'delete': Delete02Icon,
  'add': Add01Icon,
  'settings': Settings02Icon,
  'pin': FavouriteIcon, // Use favourite icon for pin
  'pin-filled': FavouriteFilledIcon, // Use filled favourite icon for filled pin
};

export function Icon({
  name,
  icon,
  size = 28,
  color,
  strokeWidth = 1.5,
}: IconProps) {
  const Component = icon ?? (name ? iconMap[name] : undefined);

  if (!Component) {
    // Silently return null for missing icons in production
    if (__DEV__) {
      console.warn('[Icon] Missing icon component:', name);
    }
    return null;
  }

  // Handle custom SVG components (like FavouriteFilledIcon) that don't use strokeWidth
  if (name === 'favourite-filled' || name === 'pin-filled') {
    return (
      <Component
        size={size}
        color={color}
      />
    );
  }

  return (
    <Component
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}

export { Home01Icon, UserIcon, AddCircleIcon, ArrowUpRight01Icon, Cancel01Icon, FavouriteIcon, ArrowLeft01Icon, SentIcon, Mic01Icon, StopIcon };


