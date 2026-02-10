import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Modal,
    Pressable,
} from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';
import { BigPrimaryButton, BigSecondaryButton, Icon } from '@/components';
import { MascotCard, MascotColorVariant } from '@/components/mascot/MascotCard';
import { getMascotImageSource, MASCOT_IMAGE_KEYS } from '@/services/admin/mascot-images';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/services/auth';

// Simple short ID generator (10 chars max for database constraint)
function generateShortId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Available colors for custom mascots (max 10 chars for database constraint)
const COLORS: MascotColorVariant[] = [
    'yellow', 'red', 'green', 'pink', 'purple',
    'brown', 'teal', 'orange', 'blue'
];

type Step = 'details' | 'appearance' | 'review';

type CreateMascotModalProps = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

export function CreateMascotModal({ visible, onClose, onSuccess }: CreateMascotModalProps) {
    const { colors } = useTheme();
    const { user } = useAuth();

    const [step, setStep] = useState<Step>('details');
    const [name, setName] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [selectedColor, setSelectedColor] = useState<MascotColorVariant>('yellow');
    const [selectedImage, setSelectedImage] = useState<string>('bear');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setStep('details');
            setName('');
            setSubtitle('');
            setSelectedColor('yellow');
            setSelectedImage('bear');
            setIsSubmitting(false);
            setError(null);
        }
    }, [visible]);

    const handleNext = () => {
        setError(null);
        if (step === 'details') {
            if (!name.trim()) {
                setError('Please enter a name for your mascot.');
                return;
            }
            if (!subtitle.trim()) {
                setError('Please enter a role or subtitle.');
                return;
            }
            setStep('appearance');
        } else if (step === 'appearance') {
            setStep('review');
        }
    };

    const handleBack = () => {
        setError(null);
        if (step === 'appearance') setStep('details');
        else if (step === 'review') setStep('appearance');
        else onClose();
    };

    const handleCreate = async () => {
        if (!user) {
            setError('You must be logged in to create a mascot.');
            return;
        }
        setIsSubmitting(true);
        setError(null);

        try {
            // Generate a short ID for the new mascot (10 chars max)
            const newMascotId = generateShortId();

            // 1. Insert into mascots table (cast to any to handle missing TypeScript types)
            const { data: mascotData, error: mascotError } = await supabase
                .from('mascots')
                .insert({
                    id: newMascotId,
                    name: name.trim(),
                    subtitle: subtitle.trim(),
                    color: selectedColor,
                    image_url: selectedImage,
                    owner_id: user.id,
                    is_custom: true,
                    is_ready: true,
                    is_active: true,
                    is_free: false,
                    is_pro: true,
                } as any)
                .select()
                .single();

            if (mascotError) throw mascotError;

            // 2. Automatically link/unlock for the user in user_mascots
            const { error: linkError } = await supabase
                .from('user_mascots')
                .insert({
                    user_id: user.id,
                    mascot_id: mascotData.id,
                    purchase_type: 'created',
                    unlocked_at: new Date().toISOString(),
                });

            if (linkError) throw linkError;

            // Success!
            onSuccess?.();
            onClose();

        } catch (err: any) {
            console.error('Create mascot error:', err);
            setError(err.message || 'Failed to create mascot');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDetailsStep = () => (
        <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>Mascot Name</Text>
            <TextInput
                style={[styles.input, {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.outline,
                    fontFamily: fontFamilies.figtree.regular,
                }]}
                placeholder="e.g. Professor Hoot"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={20}
            />

            <Text style={[styles.label, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>Role / Subtitle</Text>
            <TextInput
                style={[styles.input, {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.outline,
                    fontFamily: fontFamilies.figtree.regular,
                }]}
                placeholder="e.g. Academic Writer"
                placeholderTextColor={colors.textMuted}
                value={subtitle}
                onChangeText={setSubtitle}
                maxLength={30}
            />
            <Text style={[styles.hint, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular }]}>
                Give your mascot a specific role or personality description.
            </Text>
        </View>
    );

    const renderAppearanceStep = () => (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepScrollContent}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>Choose Color</Text>
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

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24, fontFamily: fontFamilies.figtree.semiBold }]}>Choose Avatar</Text>
            <View style={styles.imageGrid}>
                {MASCOT_IMAGE_KEYS.map((imgKey) => (
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
                            name={imgKey}
                            subtitle=""
                            imageSource={getMascotImageSource(imgKey)}
                            forceState={selectedImage === imgKey ? 'hover' : 'default'}
                            colorVariant={selectedColor}
                            onPress={() => setSelectedImage(imgKey)}
                        />
                        <View style={styles.cardOverlay} pointerEvents="none" />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    const renderReviewStep = () => (
        <View style={styles.reviewContainer}>
            <Text style={[styles.reviewTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>Preview Your Mascot</Text>

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

            <Text style={[styles.reviewHint, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular }]}>
                You can always edit prompts and skills later.
            </Text>
        </View>
    );

    const getStepTitle = () => {
        switch (step) {
            case 'details': return 'Create Mascot';
            case 'appearance': return 'Customize Look';
            case 'review': return 'Review';
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <Pressable style={styles.overlayBackground} onPress={onClose} />
                <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.outline }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.outline }]}>
                        <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
                            <Icon name="add" size={24} color={colors.buttonText} />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={[styles.modalTitle, { fontFamily: fontFamilies.figtree.semiBold, color: colors.text }]}>
                                {getStepTitle()}
                            </Text>
                            <Text style={[styles.modalSubtitle, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                                Step {step === 'details' ? '1' : step === 'appearance' ? '2' : '3'} of 3
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color={colors.textMuted} />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {step === 'details' && renderDetailsStep()}
                        {step === 'appearance' && renderAppearanceStep()}
                        {step === 'review' && renderReviewStep()}
                    </View>

                    {/* Error Display */}
                    {error && (
                        <View style={[styles.errorContainer, { backgroundColor: colors.red + '20', borderColor: colors.red }]}>
                            <Text style={[styles.errorText, { color: colors.red, fontFamily: fontFamilies.figtree.medium }]}>
                                {error}
                            </Text>
                        </View>
                    )}

                    {/* Footer */}
                    <View style={[styles.footer, { borderTopColor: colors.outline }]}>
                        <BigSecondaryButton
                            label={step === 'details' ? 'Cancel' : 'Back'}
                            onPress={handleBack}
                            disabled={isSubmitting}
                        />
                        <BigPrimaryButton
                            label={step === 'review' ? (isSubmitting ? 'Creating...' : 'Create Mascot') : 'Next'}
                            onPress={step === 'review' ? handleCreate : handleNext}
                            disabled={isSubmitting}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: Platform.OS === 'web' ? '90%' : '95%',
        maxWidth: 600,
        maxHeight: '85%',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        gap: 12,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
        gap: 4,
    },
    modalTitle: {
        fontSize: 18,
        lineHeight: 24,
    },
    modalSubtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        minHeight: 300,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 20,
        borderTopWidth: 1,
        gap: 12,
    },
    stepContainer: {
        padding: 24,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        marginTop: 16,
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
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 16,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    colorCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    selectedColorRing: {
        borderWidth: 3,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    imageOption: {
        padding: 4,
        borderRadius: 16,
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
        fontSize: 22,
        marginBottom: 24,
    },
    previewCardContainer: {
        transform: [{ scale: 1.1 }],
        marginVertical: 16,
    },
    reviewHint: {
        marginTop: 32,
        textAlign: 'center',
        maxWidth: 240,
    },
    errorContainer: {
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
    },
});
