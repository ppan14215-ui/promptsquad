import React from 'react';
import { View, Text, Modal, StyleSheet, Platform } from 'react-native';
import { useTheme, shadowToNative } from '@/design-system';
import { BigPrimaryButton } from './BigPrimaryButton';

export type ChangelogModalProps = {
    visible: boolean;
    onDismiss: () => void;
    version: string;
};

export function ChangelogModal({ visible, onDismiss, version }: ChangelogModalProps) {
    const { colors } = useTheme();

    const updates = [
        { title: 'Working Perplexity', description: 'Web-grounded search now works perfectly with all mascots.' },
        { title: 'Dynamic Mascot Names', description: 'Names and subtitles are now updated live from the cloud.' },
        { title: 'Stability Fixes', description: 'Improved chat reliability and faster loading times.' },
        { title: 'UI Improvements', description: 'Updated chat interface with better readability.' }
    ];

    const ModalContent = (
        <View style={[styles.centeredView]}>
            <View style={[
                styles.modalView,
                { backgroundColor: colors.surface, borderColor: colors.outline },
                Platform.OS === 'web' ? ({ boxShadow: '0 10px 25px rgba(0,0,0,0.2)' } as any) : shadowToNative('lg')
            ]}>
                <Text style={[styles.versionTag, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
                    v{version}
                </Text>

                <Text style={[styles.modalTitle, { color: colors.text }]}>What's New</Text>

                <View style={styles.updatesContainer}>
                    {updates.map((update, index) => (
                        <View key={index} style={styles.updateItem}>
                            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                            <View style={styles.updateText}>
                                <Text style={[styles.updateTitle, { color: colors.text }]}>{update.title}</Text>
                                <Text style={[styles.updateDescription, { color: colors.textMuted }]}>{update.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.buttonContainer}>
                    <BigPrimaryButton label="Got it!" onPress={onDismiss} />
                </View>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        width: '100%',
    },
    modalView: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
    },
    versionTag: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 16,
        overflow: 'hidden',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 24,
        textAlign: 'center',
    },
    updatesContainer: {
        alignSelf: 'stretch',
        marginBottom: 32,
    },
    updateItem: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    bullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
        marginRight: 12,
    },
    updateText: {
        flex: 1,
    },
    updateTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    updateDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    buttonContainer: {
        alignSelf: 'stretch',
    },
});

export default ChangelogModal;
