import { ScrollView, View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  lightColors,
  darkColors,
  textStyles,
  fontFamilies,
  shadows,
  shadowToCSS,
  shadowToNative,
  ShadowName,
  skeuomorphicEffects,
  skeuToCSS,
  skeuToGradient,
  SkeuomorphicName,
} from '@/design-system';

const colorEntries = Object.entries(lightColors) as [keyof typeof lightColors, string][];
const textStyleEntries = Object.entries(textStyles) as [keyof typeof textStyles, typeof textStyles[keyof typeof textStyles]][];
const shadowEntries = Object.keys(shadows) as ShadowName[];
const skeuEntries = Object.keys(skeuomorphicEffects) as SkeuomorphicName[];

export default function TokensScreen() {
  const { width } = useWindowDimensions();
  const columnWidth = width / 2;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Colors Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontFamily: fontFamilies.figtree.semiBold }]}>Colors</Text>
        <View style={styles.columnsRow}>
          <View style={[styles.column, { width: columnWidth, backgroundColor: lightColors.background }]}>
            <Text style={[styles.columnTitle, { fontFamily: fontFamilies.figtree.semiBold }]}>Light mode</Text>
            {colorEntries.map(([key, value]) => (
              <ColorSwatch key={`light-${key}`} name={key} value={value} />
            ))}
          </View>
          <View style={[styles.column, { width: columnWidth, backgroundColor: darkColors.background }]}>
            <Text style={[styles.columnTitle, { fontFamily: fontFamilies.figtree.semiBold, color: darkColors.text }]}>Dark mode</Text>
            {Object.entries(darkColors).map(([key, value]) => (
              <ColorSwatch key={`dark-${key}`} name={key} value={value} dark />
            ))}
          </View>
        </View>
      </View>

      {/* Typography Section */}
      <View style={[styles.section, { backgroundColor: lightColors.surface }]}>
        <Text style={[styles.sectionTitle, { fontFamily: fontFamilies.figtree.semiBold }]}>Typography</Text>
        {textStyleEntries.map(([name, style]) => (
          <TextStyleSwatch key={name} name={name} style={style} />
        ))}
      </View>

      {/* Shadows Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontFamily: fontFamilies.figtree.semiBold }]}>Shadows</Text>
        <View style={styles.shadowsGrid}>
          {shadowEntries.map((name) => (
            <ShadowSwatch key={name} name={name} />
          ))}
        </View>
      </View>

      {/* Skeuomorphic Effects Section */}
      <View style={[styles.section, { backgroundColor: lightColors.surface }]}>
        <Text style={[styles.sectionTitle, { fontFamily: fontFamilies.figtree.semiBold }]}>Skeuomorphic Effects</Text>
        <View style={styles.shadowsGrid}>
          {skeuEntries.map((name) => (
            <SkeuSwatch key={name} name={name} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function ColorSwatch({
  name,
  value,
  dark = false,
}: {
  name: string;
  value: string;
  dark?: boolean;
}) {
  const textColor = dark ? darkColors.text : lightColors.text;
  const mutedColor = dark ? darkColors.textMuted : lightColors.textMuted;
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatchBox, { backgroundColor: value }]} />
      <View style={styles.swatchLabel}>
        <Text style={[styles.swatchName, { color: textColor, fontFamily: fontFamilies.figtree.semiBold }]}>{name}</Text>
        <Text style={[styles.swatchValue, { color: mutedColor, fontFamily: fontFamilies.figtree.regular }]}>{value}</Text>
      </View>
    </View>
  );
}

function TextStyleSwatch({
  name,
  style,
}: {
  name: string;
  style: typeof textStyles[keyof typeof textStyles];
}) {
  const sampleText = 'The quick brown fox jumps';
  const fontName = style.fontFamily.replace(/_/g, ' ').replace(/(\d+)/, ' $1');
  const details = `${style.fontSize}px • ${style.lineHeight ? `${Math.round(style.lineHeight)}px LH` : 'Auto LH'} • ${style.letterSpacing}px LS`;

  return (
    <View style={styles.textStyleRow}>
      <View style={styles.textStyleMeta}>
        <Text style={[styles.textStyleName, { fontFamily: fontFamilies.figtree.semiBold }]}>{name}</Text>
        <Text style={[styles.textStyleDetails, { fontFamily: fontFamilies.figtree.regular }]}>{details}</Text>
        <Text style={[styles.textStyleFont, { fontFamily: fontFamilies.figtree.regular }]}>{fontName}</Text>
      </View>
      <Text
        style={{
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          color: lightColors.text,
          flexShrink: 1,
        }}
        numberOfLines={1}
      >
        {sampleText}
      </Text>
    </View>
  );
}

function ShadowSwatch({ name }: { name: ShadowName }) {
  const shadow = shadows[name];
  const layerCount = shadow.layers.length;

  // Use CSS box-shadow on web, native shadow props on iOS/Android
  const shadowStyle = Platform.select({
    web: {
      boxShadow: shadowToCSS(name),
    } as unknown as object,
    default: shadowToNative(name),
  });

  return (
    <View style={styles.shadowSwatchContainer}>
      <View style={[styles.shadowBox, shadowStyle]} />
      <Text style={[styles.shadowName, { fontFamily: fontFamilies.figtree.semiBold }]}>{name}</Text>
      <Text style={[styles.shadowDetails, { fontFamily: fontFamilies.figtree.regular }]}>
        {layerCount} layer{layerCount > 1 ? 's' : ''}
      </Text>
    </View>
  );
}

function SkeuSwatch({ name }: { name: SkeuomorphicName }) {
  const gradient = skeuToGradient(name);

  // Use CSS box-shadow on web (exact), gradient overlay on native (approximation)
  const outerShadowStyle = Platform.select({
    web: {
      boxShadow: skeuToCSS(name),
    } as unknown as object,
    default: shadowToNative(gradient.outerShadow),
  });

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.shadowSwatchContainer}>
      <View style={[styles.skeuBox, outerShadowStyle, { backgroundColor: lightColors.primary }]}>
        {!isWeb && (
          <LinearGradient
            colors={[gradient.topColor, 'transparent', gradient.bottomColor]}
            locations={[0, 0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>
      <Text style={[styles.shadowName, { fontFamily: fontFamilies.figtree.semiBold }]}>{name}</Text>
      <Text style={[styles.shadowDetails, { fontFamily: fontFamilies.figtree.regular }]}>
        inset + {shadows[gradient.outerShadow].layers.length} outer
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    marginBottom: 16,
    color: '#212121',
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    padding: 16,
  },
  columnTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: '#212121',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  swatchBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  swatchLabel: {
    marginLeft: 12,
    flexShrink: 1,
  },
  swatchName: {
    fontSize: 14,
  },
  swatchValue: {
    fontSize: 12,
  },
  textStyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  textStyleMeta: {
    width: 180,
    marginRight: 16,
  },
  textStyleName: {
    fontSize: 14,
    color: '#212121',
    textTransform: 'capitalize',
  },
  textStyleDetails: {
    fontSize: 11,
    color: '#898989',
    marginTop: 2,
  },
  textStyleFont: {
    fontSize: 11,
    color: '#898989',
    marginTop: 2,
  },
  shadowsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  shadowSwatchContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  shadowBox: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
  },
  shadowName: {
    fontSize: 14,
    color: '#212121',
  },
  shadowDetails: {
    fontSize: 11,
    color: '#898989',
    marginTop: 2,
  },
  skeuBox: {
    width: 100,
    height: 44,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
});


