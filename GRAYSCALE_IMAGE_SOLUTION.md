# Grayscale Image Solution

## Problem
React Native's `tintColor` doesn't create true grayscale - it only tints the image. CSS `filter: grayscale()` only works on web.

## Solution: Use Grayscale Image Versions

### Step 1: Create Grayscale Versions
Create grayscale versions of all mascot images and save them with a `-grayscale` suffix:
- `Bear.png` → `Bear-grayscale.png`
- `fox.png` → `fox-grayscale.png`
- etc.

### Step 2: Update Code
The code will automatically use grayscale versions when `forceGrayscale={true}` is set.

### Alternative: Use Image Processing Library
Install `react-native-color-matrix`:
```bash
npm install react-native-color-matrix
```

Then use ColorMatrix to apply grayscale filter.
