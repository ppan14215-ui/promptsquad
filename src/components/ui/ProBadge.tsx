import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/design-system';

type ProBadgeProps = {
    size?: 'small' | 'medium';
    /** Defaults to theme primary when omitted */
    color?: string;
    style?: any;
    label?: string;
};

export const ProBadge: React.FC<ProBadgeProps> = ({ size = 'small', color, style, label = 'PRO' }) => {
    const { colors } = useTheme();
    const bg = color ?? colors.primary;
    const isSmall = size === 'small';

    return (
        <View style={[
            styles.container,
            { backgroundColor: bg, borderRadius: 999, paddingVertical: isSmall ? 2 : 4, paddingHorizontal: isSmall ? 8 : 12 },
            style
        ]}>
            <Text style={[styles.text, { fontSize: isSmall ? 10 : 12 }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    text: {
        color: 'white',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
