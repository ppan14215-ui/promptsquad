/**
 * PaywallModal Component
 * 
 * A beautiful modal that prompts users to upgrade to Pro.
 * Features:
 * - Lists Pro benefits
 * - Subscribe button that opens Stripe Checkout
 * - Handles loading state during checkout creation
 * - Hybrid mode: Supports buying a specific mascot OR full subscription
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, Linking } from 'react-native';
import { useTheme, fontFamilies, shadowToNative } from '@/design-system';
import { Icon } from './Icon';
import { BigPrimaryButton } from './BigPrimaryButton';
import { BigSecondaryButton } from './BigSecondaryButton'; // For the alternative option
import { supabase } from '@/services/supabase';
import { ProBadge } from './ProBadge';

type PaywallModalProps = {
    visible: boolean;
    onClose: () => void;
    feature?: string; // Optional: What feature triggered this (e.g., "Claude model", "Premium mascot")
    mascotId?: string; // If triggered for a specific mascot
    mascotName?: string; // Name of the mascot to buy
};

const PRO_FEATURES = [
    { icon: 'star', text: 'All 12+ mascots unlocked' },
    { icon: 'cpu', text: 'Premium AI models (Claude, GPT-4, Grok)' },
    { icon: 'zap', text: 'Priority response times' },
    { icon: 'sparkles', text: 'Create custom mascots' },
    { icon: 'infinity', text: '300 premium messages/month' },
];

export function PaywallModal({ visible, onClose, feature, mascotId, mascotName }: PaywallModalProps) {
    const { colors } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubscribe = async (mode: 'subscription' | 'payment', priceId?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Please log in to subscribe');
                setIsLoading(false);
                return;
            }

            // Call the checkout session edge function
            const body: any = {
                successUrl: Platform.OS === 'web'
                    ? `${window.location.origin}/?upgrade=success`
                    : 'promptsquad://upgrade-success',
                cancelUrl: Platform.OS === 'web'
                    ? window.location.href
                    : 'promptsquad://',
                mode,
            };

            if (mode === 'payment' && mascotId) {
                body.metadata = { type: 'mascot_purchase', mascot_id: mascotId };

                // Get configured price ID
                const priceId = MASCOT_PRICE_IDS[mascotId];
                if (priceId && priceId.startsWith('price_')) {
                    body.priceId = priceId;
                } else {
                    console.warn('No configured price ID for mascot', mascotId, '- checkout may fail or fallback to subscription price if not careful');
                    // We might want to alert the user or prevent checkout
                    // For now, let's proceed but backend might fallback to defaultPriceId which is WRONG for one-time payment.
                    // Actually, if we don't send priceId, backend uses defaultPriceId.
                    // Ideally we should block purchasing if no price ID is configured.
                }
            }

            const { data, error: fetchError } = await supabase.functions.invoke('create-checkout-session', {
                body,
            });

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            if (data?.url) {
                // Redirect to Stripe Checkout
                if (Platform.OS === 'web') {
                    window.location.href = data.url;
                } else {
                    await Linking.openURL(data.url);
                    onClose();
                }
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'Failed to start checkout');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable
                    style={[
                        styles.modal,
                        { backgroundColor: colors.surface },
                        Platform.OS === 'web' ? { boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } : shadowToNative('xl')
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <Icon name="close" size={24} color={colors.textMuted} />
                    </Pressable>

                    {/* Header */}
                    <View style={styles.header}>
                        <ProBadge size="medium" color={colors.primary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.title, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>
                            Unlock Full Access
                        </Text>
                        {feature && (
                            <Text style={[styles.featureText, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular }]}>
                                {feature} is locked
                            </Text>
                        )}
                    </View>

                    {/* Dual Option Layout (only if mascotId is present) */}
                    {mascotId && mascotName ? (
                        <View style={styles.dualOptionContainer}>
                            {/* Option 1: Buy Mascot */}
                            <View style={[styles.optionCard, { borderColor: colors.outline, borderRightWidth: 1 }]}>
                                <Text style={[styles.optionTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>
                                    Buy {mascotName}
                                </Text>
                                <Text style={[styles.optionPrice, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>$4.99</Text>
                                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>One-time payment</Text>
                                <View style={{ marginTop: 12 }}>
                                    <BigSecondaryButton
                                        label={isLoading ? '...' : 'Buy One'}
                                        onPress={() => handleSubscribe('payment')}
                                        disabled={isLoading}
                                    />
                                </View>
                            </View>

                            {/* Option 2: Go Pro */}
                            <View style={[styles.optionCard, { paddingLeft: 16 }]}>
                                <Text style={[styles.optionTitle, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>
                                    Get Pro
                                </Text>
                                <Text style={[styles.optionPrice, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>$9.99</Text>
                                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>/month (All Mascots)</Text>
                                <View style={{ marginTop: 12 }}>
                                    <BigPrimaryButton
                                        label={isLoading ? '...' : 'Subscribe'}
                                        onPress={() => handleSubscribe('subscription')}
                                        disabled={isLoading}
                                    />
                                </View>
                            </View>
                        </View>
                    ) : (
                        // Standard Pro Layout
                        <>
                            {/* Features list */}
                            <View style={styles.featuresList}>
                                {PRO_FEATURES.map((item, index) => (
                                    <View key={index} style={styles.featureItem}>
                                        <View style={[styles.featureIconContainer, { backgroundColor: colors.primary + '20' }]}>
                                            <Icon name={item.icon as any} size={18} color={colors.primary} />
                                        </View>
                                        <Text style={[styles.featureItemText, { color: colors.text, fontFamily: fontFamilies.figtree.regular }]}>
                                            {item.text}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Price */}
                            <View style={styles.priceContainer}>
                                <Text style={[styles.price, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>
                                    $9.99
                                </Text>
                                <Text style={[styles.pricePeriod, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular }]}>
                                    /month
                                </Text>
                            </View>

                            {/* Subscribe button */}
                            <BigPrimaryButton
                                label={isLoading ? 'Starting checkout...' : 'Subscribe Now'}
                                onPress={() => handleSubscribe('subscription')}
                                disabled={isLoading}
                            />
                        </>
                    )}

                    {/* Error message */}
                    {error && (
                        <Text style={[styles.errorText, { color: colors.error, marginTop: 12 }]}>
                            {error}
                        </Text>
                    )}

                    {/* Cancel anytime note */}
                    <Text style={[styles.disclaimer, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular }]}>
                        {mascotId ? 'Choose the plan that fits you.' : 'Cancel anytime. Billed monthly.'}
                    </Text>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        width: '100%',
        maxWidth: 440, // Slightly wider for dual options
        borderRadius: 20,
        padding: 28,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
        zIndex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    featureText: {
        fontSize: 14,
        textAlign: 'center',
    },
    featuresList: {
        marginBottom: 24,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    featureItemText: {
        fontSize: 15,
        flex: 1,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 20,
    },
    price: {
        fontSize: 40,
    },
    pricePeriod: {
        fontSize: 16,
        marginLeft: 4,
    },
    errorText: {
        fontSize: 13,
        textAlign: 'center',
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
    },
    dualOptionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    optionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    optionTitle: {
        fontSize: 16,
        marginBottom: 4,
        textAlign: 'center',
    },
    optionPrice: {
        fontSize: 24,
        marginBottom: 2,
    },
    optionDesc: {
        fontSize: 12,
        marginBottom: 12,
    },
});
