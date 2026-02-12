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
import { createSkill, upsertPersonality, useIsAdmin } from '@/services/admin';

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

type Step = 'create' | 'setup' | 'review';
type AccessTier = 'free' | 'pro';
type DraftSkill = {
    id: string;
    label: string;
    prompt: string;
};

type CreateMascotModalProps = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: (mascotId: string) => void;
};

export function CreateMascotModal({ visible, onClose, onSuccess }: CreateMascotModalProps) {
    const { colors } = useTheme();
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
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setStep('create');
            setName('');
            setSubtitle('');
            setSelectedColor('yellow');
            setSelectedImage('bear');
            setAccessTier('pro');
            setBio('');
            setPersonality('');
            setDraftSkills([{ id: '1', label: '', prompt: '' }]);
            setIsSubmitting(false);
            setError(null);
        }
    }, [visible]);

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
        setError(null);
        if (step === 'create') {
            if (!name.trim()) {
                setError('Please enter a name for your mascot.');
                return;
            }
            if (!subtitle.trim()) {
                setError('Please enter a role or subtitle.');
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
                setError('Each skill must include both a label and a prompt, or be left empty.');
                return;
            }
            setStep('review');
        }
    };

    const handleBack = () => {
        setError(null);
        if (step === 'review') setStep('setup');
        else if (step === 'setup') setStep('create');
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
            const isGlobalMascot = isAdmin;
            const isProMascot = isGlobalMascot ? accessTier === 'pro' : false;
            const { data: mascotData, error: mascotError } = await supabase
                .from('mascots')
                .insert({
                    id: newMascotId,
                    name: name.trim(),
                    subtitle: subtitle.trim(),
                    color: selectedColor,
                    image_url: selectedImage,
                    bio: !isGlobalMascot ? (bio.trim() || null) : null,
                    owner_id: isGlobalMascot ? null : user.id,
                    is_custom: !isGlobalMascot,
                    is_ready: true,
                    is_active: true,
                    is_free: !isProMascot,
                    is_pro: isProMascot,
                } as any)
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

            // Success! Pass the new mascot ID so parent can navigate to chat
            onClose();
            onSuccess?.(mascotData.id);

        } catch (err: any) {
            console.error('Create mascot error:', err);
            setError(err.message || 'Failed to create mascot');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCreateStep = () => (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepScrollContent}>
            <Text style={[styles.label, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold, marginTop: 0 }]}>Mascot Name</Text>
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

            {isAdmin && (
                <>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold, marginTop: 24 }]}>Access Tier</Text>
                    <View style={styles.tierContainer}>
                        <TouchableOpacity
                            onPress={() => setAccessTier('free')}
                            style={[
                                styles.tierButton,
                                { borderColor: colors.outline },
                                accessTier === 'free' && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                        >
                            <Text style={[
                                styles.tierButtonText,
                                { color: accessTier === 'free' ? colors.buttonText : colors.text, fontFamily: fontFamilies.figtree.medium },
                            ]}>
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
                            <Text style={[
                                styles.tierButtonText,
                                { color: accessTier === 'pro' ? colors.buttonText : colors.text, fontFamily: fontFamilies.figtree.medium },
                            ]}>
                                Pro
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold, marginTop: 24 }]}>Choose Color</Text>
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
                        style={styles.imageOption}
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

    const renderSetupStep = () => (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepScrollContent}>
            {!isAdmin && (
                <>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, fontFamily: fontFamilies.figtree.semiBold }]}>
                        Bio (optional)
                    </Text>
                    <TextInput
                        style={[styles.textAreaInput, {
                            backgroundColor: colors.surface,
                            color: colors.text,
                            borderColor: colors.outline,
                            fontFamily: fontFamilies.figtree.regular,
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
                    <Text style={[styles.hint, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular, marginTop: 8, marginBottom: 4 }]}>
                        For custom mascots, this manual bio appears in the details card.
                    </Text>
                </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24, fontFamily: fontFamilies.figtree.semiBold }]}>
                Personality (optional)
            </Text>
            <TextInput
                style={[styles.textAreaInput, {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.outline,
                    fontFamily: fontFamilies.figtree.regular,
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
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold, marginTop: 24, marginBottom: 0 }]}>
                    Skills (optional)
                </Text>
                <TouchableOpacity
                    onPress={addDraftSkill}
                    style={[styles.addSkillButton, { borderColor: colors.outline, backgroundColor: colors.surface }]}
                >
                    <Icon name="add" size={16} color={colors.primary} />
                    <Text style={[styles.addSkillButtonText, { color: colors.primary, fontFamily: fontFamilies.figtree.medium }]}>
                        Add skill
                    </Text>
                </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular, marginBottom: 12 }]}>
                Optional at creation. You can add or edit more later from mascot tabs.
            </Text>

            {draftSkills.map((skill, index) => (
                <View
                    key={skill.id}
                    style={[styles.skillDraftCard, { borderColor: colors.outline, backgroundColor: colors.surface }]}
                >
                    <View style={styles.skillDraftHeader}>
                        <Text style={[styles.skillDraftTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>
                            Skill {index + 1}
                        </Text>
                        {draftSkills.length > 1 && (
                            <TouchableOpacity onPress={() => removeDraftSkill(skill.id)}>
                                <Text style={[styles.removeSkillText, { color: colors.red, fontFamily: fontFamilies.figtree.medium }]}>
                                    Remove
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.outline,
                            fontFamily: fontFamilies.figtree.regular,
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
                            fontFamily: fontFamilies.figtree.regular,
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
            case 'create': return 'Create Mascot';
            case 'setup': return 'Setup';
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

                        <View style={styles.headerText}>
                            <Text style={[styles.modalTitle, { fontFamily: fontFamilies.figtree.semiBold, color: colors.text }]}>
                                {getStepTitle()}
                            </Text>
                            <Text style={[styles.modalSubtitle, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                                Step {step === 'create' ? '1' : step === 'setup' ? '2' : '3'} of 3
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color={colors.textMuted} />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {step === 'create' && renderCreateStep()}
                        {step === 'setup' && renderSetupStep()}
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
                            label={step === 'create' ? 'Cancel' : 'Back'}
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
        padding: 16,
        borderBottomWidth: 1,
        gap: 12,
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
        padding: 16,
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
    tierContainer: {
        flexDirection: 'row',
        gap: 8,
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
    },
    removeSkillText: {
        fontSize: 13,
        lineHeight: 18,
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
