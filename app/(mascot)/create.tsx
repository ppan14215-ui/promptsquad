import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    Alert,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fontFamilies } from '@/design-system';
import { BigPrimaryButton, TextButton } from '@/components';
import { MascotCard, MascotColorVariant } from '@/components/mascot/MascotCard';
import { getMascotImageSource, getMascotGrayscaleImageSource } from '@/services/admin/mascot-images';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/services/auth';

// Available colors for custom mascots
const COLORS: MascotColorVariant[] = [
    'yellow', 'red', 'green', 'pink', 'purple',
    'darkPurple', 'brown', 'teal', 'orange', 'blue'
];

// Available images (using keys from mascot-images.ts service)
// We hardcode the keys here to ensure order/availability, or we could import them if exported
const MASCOT_IMAGES = [
    'bear', 'cat', 'fox', 'owl', 'panda', 'turtle', 'zebra',
    'badger', 'mouse', 'pig', 'camel', 'frog', 'giraffe', 'lion', 'seahorse'
];

type Step = 'details' | 'appearance' | 'review';

export default function CreateMascotScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [step, setStep] = useState<Step>('details');
    const [name, setName] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [selectedColor, setSelectedColor] = useState<MascotColorVariant>('yellow');
    const [selectedImage, setSelectedImage] = useState<string>('bear');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNext = () => {
        if (step === 'details') {
            if (!name.trim()) {
                Alert.alert('Error', 'Please enter a name for your mascot.');
                return;
            }
            if (!subtitle.trim()) {
                Alert.alert('Error', 'Please enter a role or subtitle.');
                return;
            }
            setStep('appearance');
        } else if (step === 'appearance') {
            setStep('review');
        }
    };

    const handleBack = () => {
        if (step === 'appearance') setStep('details');
        else if (step === 'review') setStep('appearance');
        else router.back();
    };

    const handleCreate = async () => {
        if (!user) return;
        setIsSubmitting(true);

        try {
            // 1. Insert into mascots table
            const { data: mascotData, error: mascotError } = await supabase
                .from('mascots')
                .insert({
                    name: name.trim(),
                    subtitle: subtitle.trim(),
                    color: selectedColor,
                    image_url: selectedImage, // We store the key, relying on frontend helper to map
                    owner_id: user.id,
                    is_custom: true,
                    is_ready: true,
                    is_active: true,
                    is_free: false,
                    is_pro: true, // Custom mascots are considered Pro/Special
                })
                .select()
                .single();

            if (mascotError) throw mascotError;

            // 2. Automatically link/unlock for the user in user_mascots
            // Although owner RLS allows read, we track "ownership/unlock" in user_mascots usually?
            // Actually, for custom mascots, maybe we don't need user_mascots entry if RLS handles it?
            // But the app logic probably relies on `user_mascots` join for "My Mascots" list.
            // Let's add it to verify.

            const { error: linkError } = await supabase
                .from('user_mascots')
                .insert({
                    user_id: user.id,
                    mascot_id: mascotData.id,
                    purchase_type: 'created',
                    unlocked_at: new Date().toISOString(),
                });

            if (linkError) throw linkError;

            Alert.alert('Success', 'Your custom mascot has been created!', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') }
            ]);

        } catch (error: any) {
            console.error('Create mascot error:', error);
            Alert.alert('Error', `Failed to create mascot: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDetailsStep = () => (
        <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Mascot Name</Text>
            <TextInput
                style={[styles.input, {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.outline
                }]}
                placeholder="e.g. Professor Hoot"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={20}
            />

            <Text style={[styles.label, { color: colors.text }]}>Role / Subtitle</Text>
            <TextInput
                style={[styles.input, {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.outline
                }]}
                placeholder="e.g. Academic Writer"
                placeholderTextColor={colors.textMuted}
                value={subtitle}
                onChangeText={setSubtitle}
                maxLength={30}
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>
                Give your mascot a specific role or personality description.
            </Text>
        </View>
    );

    const renderAppearanceStep = () => (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepScrollContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Color</Text>
            <View style={styles.colorGrid}>
                {COLORS.map(c => (
                    <TouchableOpacity
                        key={c}
                        onPress={() => setSelectedColor(c)}
                        style={[
                            styles.colorCircle,
                            { backgroundColor: colors[c] },
                            selectedColor === c && styles.selectedColorRing,
                            selectedColor === c && { borderColor: colors.text }
                        ]}
                    />
                ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Choose Avatar</Text>
            <View style={styles.imageGrid}>
                {MASCOT_IMAGES.map(imgKey => (
                    <TouchableOpacity
                        key={imgKey}
                        onPress={() => setSelectedImage(imgKey)}
                        style={[
                            styles.imageOption,
                            selectedImage === imgKey && {
                                borderColor: colors.primary,
                                backgroundColor: colors.primaryBg
                            }
                        ]}
                    >
                        <MascotCard
                            id={imgKey}
                            name={imgKey} // Dummy
                            subtitle=""
                            imageSource={getMascotImageSource(imgKey)}
                            forceState={selectedImage === imgKey ? 'hover' : 'default'}
                            colorVariant={selectedColor}
                            onPress={() => setSelectedImage(imgKey)}
                        />
                        {/* Overlay to block card press safely if needed, or rely on prop */}
                        <View style={styles.cardOverlay} pointerEvents="none" />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    const renderReviewStep = () => (
        <View style={styles.reviewContainer}>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>Preview Your Mascot</Text>

            <View style={styles.previewCardContainer}>
                <MascotCard
                    id="preview"
                    name={name}
                    subtitle={subtitle}
                    imageSource={getMascotImageSource(selectedImage)}
                    colorVariant={selectedColor}
                    forceState="hover"
                    isUnlocked={true}
                />
            </View>

            <Text style={[styles.reviewHint, { color: colors.textMuted }]}>
                You can always edit prompts and skills later (Coming Soon).
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.outline }]}>
                    <TextButton label="Back" onPress={handleBack} />
                    <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>
                        {step === 'details' ? 'Create Mascot' :
                            step === 'appearance' ? 'Customize Look' : 'Review'}
                    </Text>
                    <View style={{ width: 60 }} /> {/* Spacer for centered title */}
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {step === 'details' && renderDetailsStep()}
                    {step === 'appearance' && renderAppearanceStep()}
                    {step === 'review' && renderReviewStep()}
                </View>

                {/* Footer */}
                <View style={[styles.footer, {
                    borderTopColor: colors.outline,
                    paddingBottom: Math.max(16, insets.bottom)
                }]}>
                    <BigPrimaryButton
                        label={step === 'review' ? (isSubmitting ? 'Creating...' : 'Create Mascot') : 'Next'}
                        onPress={step === 'review' ? handleCreate : handleNext}
                        disabled={isSubmitting}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
    },
    content: {
        flex: 1,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    stepContainer: {
        padding: 24,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        marginTop: 16,
        fontWeight: '600',
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    hint: {
        marginTop: 8,
        fontSize: 14,
    },
    stepScroll: {
        flex: 1,
    },
    stepScrollContent: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 16,
        fontWeight: '600',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    colorCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    selectedColorRing: {
        borderWidth: 4,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    imageOption: {
        padding: 4,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    reviewContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    reviewTitle: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 32,
    },
    previewCardContainer: {
        transform: [{ scale: 1.2 }],
        marginVertical: 24,
    },
    reviewHint: {
        marginTop: 48,
        textAlign: 'center',
        maxWidth: 240,
    },
});
