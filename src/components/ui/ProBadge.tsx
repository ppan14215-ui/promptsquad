import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ProBadgeProps = {
    size?: 'small' | 'medium';
    color?: string;
    style?: any;
};

export const ProBadge: React.FC<ProBadgeProps> = ({ size = 'small', color = '#8A2BE2', style }) => {
    const isSmall = size === 'small';

    return (
        <View style={[
            styles.container,
            { backgroundColor: color, borderRadius: 999, paddingVertical: isSmall ? 2 : 4, paddingHorizontal: isSmall ? 8 : 12 },
            style
        ]}>
            <Text style={[styles.text, { fontSize: isSmall ? 10 : 12 }]}>PRO</Text>
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
