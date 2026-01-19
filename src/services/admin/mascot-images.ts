/**
 * Helper to map database image_url to local image sources
 * Database stores image keys like 'bear', 'fox', etc.
 */
import { ImageSourcePropType } from 'react-native';

const mascotImages = {
  bear: require('../../../assets/mascots/Bear.png'),
  cat: require('../../../assets/mascots/cat.png'),
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
};

/**
 * Get local image source from database image_url
 */
export function getMascotImageSource(imageUrl: string | null): ImageSourcePropType | undefined {
  if (!imageUrl) return undefined;
  
  // Extract image key from URL (e.g., 'bear' from '/mascots/bear.png' or just 'bear')
  const imageKey = imageUrl.split('/').pop()?.split('.')[0] || imageUrl;
  
  return mascotImages[imageKey as keyof typeof mascotImages];
}

/**
 * Get grayscale image source from database image_url
 */
export function getMascotGrayscaleImageSource(imageUrl: string | null): ImageSourcePropType | undefined {
  if (!imageUrl) return undefined;
  
  // Extract image key from URL
  const imageKey = imageUrl.split('/').pop()?.split('.')[0] || imageUrl;
  
  return grayscaleImages[imageKey as keyof typeof grayscaleImages];
}
