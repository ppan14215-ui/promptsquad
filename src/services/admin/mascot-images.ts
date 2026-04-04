/**
 * Helper to map database image_url to local image sources
 * Database stores image keys like 'bear', 'fox', etc.
 */
import { ImageSourcePropType } from 'react-native';

// All available mascot images
const mascotImages = {
  // Original mascots
  bear: require('../../../assets/mascots/Bear.png'),
  fox: require('../../../assets/mascots/fox.png'),
  owl: require('../../../assets/mascots/owl.png'),
  panda: require('../../../assets/mascots/panda.png'),
  turtle: require('../../../assets/mascots/turtle.png'),
  zebra: require('../../../assets/mascots/zebra.png'),
  badger: require('../../../assets/mascots/badger.png'),
  mouse: require('../../../assets/mascots/mouse.png'),
  pig: require('../../../assets/mascots/pig.png'),
  camel: require('../../../assets/mascots/camel.png'),
  frog: require('../../../assets/mascots/frog.png'),
  giraffe: require('../../../assets/mascots/giraffe.png'),
  lion: require('../../../assets/mascots/lion.png'),
  seahorse: require('../../../assets/mascots/searhorse.png'),

  // New mascots
  ant: require('../../../assets/mascots/ant.png'),
  beaver: require('../../../assets/mascots/beaver.png'),
  bull: require('../../../assets/mascots/bull.png'),
  cat: require('../../../assets/mascots/cat.png'),
  eagle: require('../../../assets/mascots/eagle.png'),
  horse: require('../../../assets/mascots/horse.png'),
  koala: require('../../../assets/mascots/koala.png'),
  monkey: require('../../../assets/mascots/monkey.png'),
  penguin: require('../../../assets/mascots/penguin.png'),
};

const grayscaleImages: Partial<Record<keyof typeof mascotImages, ImageSourcePropType>> = {
  bear: require('../../../assets/mascots/Bear-grayscale.png'),
  badger: require('../../../assets/mascots/badger-grayscale.png'),
  camel: require('../../../assets/mascots/camel-grayscale.png'),
  fox: require('../../../assets/mascots/fox-grayscale.png'),
  frog: require('../../../assets/mascots/frog-grayscale.png'),
  giraffe: require('../../../assets/mascots/giraffe-grayscale.png'),
  lion: require('../../../assets/mascots/lion-grayscale.png'),
  mouse: require('../../../assets/mascots/mouse-grayscale.png'),
  owl: require('../../../assets/mascots/owl-grayscale.png'),
  panda: require('../../../assets/mascots/panda-grayscale.png'),
  pig: require('../../../assets/mascots/pig-grayscale.png'),
  seahorse: require('../../../assets/mascots/searhorse-grayscale.png'),
  turtle: require('../../../assets/mascots/turtle-grayscale.png'),
  zebra: require('../../../assets/mascots/zebra-grayscale.png'),
  // New mascots grayscale
  ant: require('../../../assets/mascots/ant-grayscale.png'),
  beaver: require('../../../assets/mascots/beaver-grayscale.png'),
  bull: require('../../../assets/mascots/bull-grayscale.png'),
  eagle: require('../../../assets/mascots/eagle-grayscale.png'),
  horse: require('../../../assets/mascots/horse-grayscale.png'),
  koala: require('../../../assets/mascots/koala-grayscale.png'),
  monkey: require('../../../assets/mascots/monkey-grayscale.png'),
  penguin: require('../../../assets/mascots/penguin-grayscale.png'),
};

// Export the list of all available mascot image keys
export const MASCOT_IMAGE_KEYS = Object.keys(mascotImages) as (keyof typeof mascotImages)[];

function isRemoteImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function localKeyFromImageRef(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  const last = trimmed.split('/').pop()?.split('.')[0] || trimmed;
  return last.toLowerCase();
}

/**
 * Get image source from database `image_url`: remote HTTPS URL, or bundled mascot key (e.g. bear, fox).
 */
export function getMascotImageSource(imageUrl: string | null): ImageSourcePropType | undefined {
  if (!imageUrl) return undefined;

  const trimmed = imageUrl.trim();
  if (isRemoteImageUrl(trimmed)) {
    return { uri: trimmed };
  }

  const key = localKeyFromImageRef(trimmed) as keyof typeof mascotImages;
  if (mascotImages[key]) return mascotImages[key];

  return undefined;
}

/**
 * Grayscale asset for bundled keys only; remote URLs rely on CSS/filter or color image fallback.
 */
export function getMascotGrayscaleImageSource(imageUrl: string | null): ImageSourcePropType | undefined {
  if (!imageUrl) return undefined;
  if (isRemoteImageUrl(imageUrl.trim())) return undefined;

  const key = localKeyFromImageRef(imageUrl) as keyof typeof grayscaleImages;
  return grayscaleImages[key];
}

/** Collect remote URIs for expo-image prefetch (deduped). */
export function collectRemoteMascotImageUris(imageUrls: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const u of imageUrls) {
    const t = u?.trim();
    if (t && isRemoteImageUrl(t)) out.push(t);
  }
  return [...new Set(out)];
}
