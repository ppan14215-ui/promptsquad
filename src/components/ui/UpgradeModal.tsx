import React from 'react';
import { View, Text, Modal, StyleSheet, Platform, Pressable } from 'react-native';
import { useTheme, shadowToNative, fontFamilies } from '@/design-system';
import { BigPrimaryButton } from './BigPrimaryButton';
import { Icon } from './Icon';

export type UpgradeModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onUpgrade?: () => void;
    title?: string;
    description?: string;
};

export function UpgradeModal({
    visible,
    onDismiss,
    onUpgrade,
    title = 'Upgrade to Pro',
    description = 'Unlock premium models, create custom mascots, and get unlimited access.'
}: UpgradeModalProps) {
    const { colors } = useTheme();

    const handleUpgrade = () => {
        onDismiss();
        if (onUpgrade) {
            onUpgrade();
        } else {
            // Default behavior if not provided? Maybe just log for now
            console.log('Upgrade pressed (no callback provided)');
        }
    };

    const ModalContent = (
        <View style={styles.centeredView}>
            <View style={[
                styles.modalView,
                { backgroundColor: colors.surface, borderColor: colors.outline },
                Platform.OS === 'web' ? ({ boxShadow: '0 10px 25px rgba(0,0,0,0.2)' } as any) : shadowToNative('lg')
            ]}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Icon name="idea" size={32} color={colors.primary} />
                </View>

                <Text style={[styles.modalTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>
                    {title}
                </Text>

                <Text style={[styles.modalDescription, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular }]}>
                    {description}
                </Text>

                <View style={styles.buttonContainer}>
                    <BigPrimaryButton label="Upgrade now" onPress={handleUpgrade} />
                </View>

                <Pressable onPress={onDismiss} style={styles.closeButton}>
                    <Text style={[styles.closeText, { color: colors.textMuted, fontFamily: fontFamilies.figtree.medium }]}>
                        Maybe later
                    </Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                {ModalContent}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        width: '100%',
    },
    modalView: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 12,
    },
    modalDescription: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    buttonContainer: {
        alignSelf: 'stretch',
        marginBottom: 16,
    },
    closeButton: {
        padding: 8,
    },
    closeText: {
        fontSize: 14,
    },
});

export default UpgradeModal;
