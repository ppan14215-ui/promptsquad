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
import { getMascotImageSource, getMascotGrayscaleImageSource, MASCOT_IMAGE_KEYS } from '@/services/admin/mascot-images';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/services/auth';
import { createSkill, upsertPersonality, useIsAdmin } from '@/services/admin';

// Available colors for custom mascots
const COLORS: MascotColorVariant[] = [
    'yellow', 'red', 'green', 'pink', 'purple',
    'darkPurple', 'brown', 'teal', 'orange', 'blue'
];

type Step = 'create' | 'setup' | 'review';
type AccessTier = 'free' | 'pro';
type DraftSkill = {
    id: string;
    label: string;
    prompt: string;
};

export default function CreateMascotScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { isAdmin } = useIsAdmin();

    const [step, setStep] = useState<Step>('create');
    const [name, setName] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [selectedColor, setSelectedColor] = useState<MascotColorVariant>('yellow');
    const [selectedImage, setSelectedImage] = useState<string>('bear');
    const [accessTier, setAccessTier] = useState<AccessTier>('pro');
    const [bio, setBio] = useState('');
    const [personality, setPersonality] = useState('');
    const [draftSkills, setDraftSkills] = useState<DraftSkill[]>([{ id: '1', label: '', prompt: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateDraftSkill = (id: string, field: 'label' | 'prompt', value: string) => {
        setDraftSkills((prev) => prev.map((skill) => (skill.id === id ? { ...skill, [field]: value } : skill)));
    };

    const addDraftSkill = () => {
        setDraftSkills((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, label: '', prompt: '' }]);
    };

    const removeDraftSkill = (id: string) => {
        setDraftSkills((prev) => (prev.length > 1 ? prev.filter((skill) => skill.id !== id) : prev));
    };

    const handleNext = () => {
        if (step === 'create') {
            if (!name.trim()) {
                Alert.alert('Error', 'Please enter a name for your mascot.');
                return;
            }
            if (!subtitle.trim()) {
                Alert.alert('Error', 'Please enter a role or subtitle.');
                return;
            }
            setStep('setup');
            return;
        }
        if (step === 'setup') {
            const hasIncompleteSkill = draftSkills.some((skill) => {
                const hasLabel = !!skill.label.trim();
                const hasPrompt = !!skill.prompt.trim();
                return hasLabel !== hasPrompt;
            });
            if (hasIncompleteSkill) {
                Alert.alert('Error', 'Each skill needs both a label and a prompt, or both left empty.');
                return;
            }
            setStep('review');
        }
    };

    const handleBack = () => {
        if (step === 'review') setStep('setup');
        else if (step === 'setup') setStep('create');
        else router.back();
    };

    const handleCreate = async () => {
        if (!user) return;
        setIsSubmitting(true);

        try {
            // Generate a short ID (mascots uses VARCHAR(10) IDs)
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let newId = '';
            for (let i = 0; i < 10; i++) newId += chars.charAt(Math.floor(Math.random() * chars.length));

            // 1. Insert into mascots table
            const isGlobalMascot = isAdmin;
            const isProMascot = isGlobalMascot ? accessTier === 'pro' : false;
            const { data: mascotData, error: mascotError } = await supabase
                .from('mascots')
                .insert({
                    id: newId,
                    name: name.trim(),
                    subtitle: subtitle.trim(),
                    color: selectedColor,
                    image_url: selectedImage, // We store the key, relying on frontend helper to map
                    bio: !isGlobalMascot ? (bio.trim() || null) : null,
                    owner_id: isGlobalMascot ? null : user.id,
                    is_custom: !isGlobalMascot,
                    is_ready: true,
                    is_active: true,
                    is_free: !isProMascot,
                    is_pro: isProMascot,
                })
                .select()
                .single();

            if (mascotError) throw mascotError;

            // 2. For private custom mascots, link/unlock for the creator.
            if (!isGlobalMascot) {
                const { error: linkError } = await supabase
                    .from('user_mascots')
                    .insert({
                        user_id: user.id,
                        mascot_id: mascotData.id,
                        purchase_type: 'created',
                        unlocked_at: new Date().toISOString(),
                    });

                if (linkError) throw linkError;
            }

            const personalityValue = personality.trim();
            if (personalityValue) {
                await upsertPersonality(mascotData.id, personalityValue);
            }

            const completedSkills = draftSkills
                .map((skill, index) => ({
                    label: skill.label.trim(),
                    prompt: skill.prompt.trim(),
                    sortOrder: index,
                }))
                .filter((skill) => skill.label && skill.prompt);

            for (const skill of completedSkills) {
                await createSkill(mascotData.id, skill.label, skill.prompt, skill.sortOrder);
            }

            // Navigate directly to chat with the new mascot
            router.replace(`/chat/${mascotData.id}`);

        } catch (error: any) {
            console.error('Create mascot error:', error);
            Alert.alert('Error', `Failed to create mascot: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCreateStep = () => (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepScrollContent}>
            <Text style={[styles.label, styles.firstLabel, { color: colors.text }]}>Mascot Name</Text>
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

            {isAdmin && (
                <>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Access Tier</Text>
                    <View style={styles.tierContainer}>
                        <TouchableOpacity
                            onPress={() => setAccessTier('free')}
                            style={[
                                styles.tierButton,
                                { borderColor: colors.outline },
                                accessTier === 'free' && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                        >
                            <Text style={[styles.tierButtonText, { color: accessTier === 'free' ? colors.buttonText : colors.text }]}>
                                Free
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setAccessTier('pro')}
                            style={[
                                styles.tierButton,
                                { borderColor: colors.outline },
                                accessTier === 'pro' && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                        >
                            <Text style={[styles.tierButtonText, { color: accessTier === 'pro' ? colors.buttonText : colors.text }]}>
                                Pro
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

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
                {MASCOT_IMAGE_KEYS.map(imgKey => (
                    <TouchableOpacity
                        key={imgKey}
                        onPress={() => setSelectedImage(imgKey)}
                        style={styles.imageOption}
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

    const renderSetupStep = () => (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepScrollContent}>
            {!isAdmin && (
                <>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>Bio (optional)</Text>
                    <TextInput
                        style={[styles.textAreaInput, {
                            backgroundColor: colors.surface,
                            color: colors.text,
                            borderColor: colors.outline,
                            minHeight: 88,
                        }]}
                        placeholder="Short bio shown in mascot details..."
                        placeholderTextColor={colors.textMuted}
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={3}
                        maxLength={220}
                        textAlignVertical="top"
                    />
                    <Text style={[styles.hint, { color: colors.textMuted, marginTop: 8, marginBottom: 4 }]}>
                        For custom mascots, this manual bio appears in the details card.
                    </Text>
                </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Personality (optional)</Text>
            <TextInput
                style={[styles.textAreaInput, {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.outline,
                }]}
                placeholder="Define how this mascot communicates and behaves..."
                placeholderTextColor={colors.textMuted}
                value={personality}
                onChangeText={setPersonality}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
            />

            <View style={styles.skillsHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24, marginBottom: 0 }]}>Skills (optional)</Text>
                <TouchableOpacity
                    onPress={addDraftSkill}
                    style={[styles.addSkillButton, { borderColor: colors.outline, backgroundColor: colors.surface }]}
                >
                    <Icon name="add" size={16} color={colors.primary} />
                    <Text style={[styles.addSkillButtonText, { color: colors.primary }]}>Add skill</Text>
                </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 12 }]}>
                Optional now. You can continue editing from mascot tabs.
            </Text>

            {draftSkills.map((skill, index) => (
                <View key={skill.id} style={[styles.skillDraftCard, { borderColor: colors.outline, backgroundColor: colors.surface }]}>
                    <View style={styles.skillDraftHeader}>
                        <Text style={[styles.skillDraftTitle, { color: colors.text }]}>Skill {index + 1}</Text>
                        {draftSkills.length > 1 && (
                            <TouchableOpacity onPress={() => removeDraftSkill(skill.id)}>
                                <Text style={[styles.removeSkillText, { color: colors.red }]}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.outline,
                            marginTop: 10,
                        }]}
                        placeholder="Skill label (e.g. Resume review)"
                        placeholderTextColor={colors.textMuted}
                        value={skill.label}
                        onChangeText={(value) => updateDraftSkill(skill.id, 'label', value)}
                        maxLength={40}
                    />
                    <TextInput
                        style={[styles.textAreaInput, {
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.outline,
                            marginTop: 10,
                        }]}
                        placeholder="Skill prompt"
                        placeholderTextColor={colors.textMuted}
                        value={skill.prompt}
                        onChangeText={(value) => updateDraftSkill(skill.id, 'prompt', value)}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>
            ))}
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
                        {step === 'create' ? 'Create Mascot' : step === 'setup' ? 'Setup' : 'Review'}
                    </Text>
                    <View style={{ width: 60 }} /> {/* Spacer for centered title */}
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {step === 'create' && renderCreateStep()}
                    {step === 'setup' && renderSetupStep()}
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
    stepScroll: {
        flex: 1,
    },
    stepScrollContent: {
        padding: 24,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        marginTop: 16,
        fontWeight: '600',
    },
    firstLabel: {
        marginTop: 0,
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
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 16,
        marginTop: 24,
        fontWeight: '600',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    tierContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    tierButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    tierButtonText: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fontFamilies.figtree.medium,
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
    textAreaInput: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        minHeight: 120,
    },
    skillsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    addSkillButton: {
        marginTop: 24,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addSkillButtonText: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: fontFamilies.figtree.medium,
    },
    skillDraftCard: {
        marginTop: 12,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    skillDraftHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skillDraftTitle: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fontFamilies.figtree.semiBold,
    },
    removeSkillText: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: fontFamilies.figtree.medium,
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
