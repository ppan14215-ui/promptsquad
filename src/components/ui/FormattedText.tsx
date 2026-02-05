/**
 * FormattedText Component
 * 
 * Renders text with simple markdown-style formatting support.
 * Supports:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 * - Line breaks
 * - Numbered lists (1. 2. 3.)
 * - Bullet points (- or *)
 */

import React from 'react';
import { Text, TextStyle, StyleSheet, View } from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';

type FormattedTextProps = {
    children: string;
    style?: TextStyle;
    baseColor?: string;
};

type TextSegment = {
    text: string;
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
};

function parseInlineFormatting(text: string): TextSegment[] {
    const segments: TextSegment[] = [];

    // Regex patterns for inline formatting
    // Order matters: check bold first (** or __), then italic (* or _)
    const pattern = /(\*\*(.+?)\*\*|__(.+?)__|`(.+?)`|\*(.+?)\*|_(.+?)_)/g;

    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            segments.push({ text: text.slice(lastIndex, match.index) });
        }

        // Determine the type of formatting
        if (match[2] || match[3]) {
            // Bold: **text** or __text__
            segments.push({ text: match[2] || match[3], bold: true });
        } else if (match[4]) {
            // Code: `text`
            segments.push({ text: match[4], code: true });
        } else if (match[5] || match[6]) {
            // Italic: *text* or _text_
            segments.push({ text: match[5] || match[6], italic: true });
        }

        lastIndex = pattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        segments.push({ text: text.slice(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ text }];
}

function isListItem(line: string): { type: 'bullet' | 'number' | null; content: string; number?: number } {
    // Check for numbered list (1. 2. etc)
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
        return { type: 'number', content: numberedMatch[2], number: parseInt(numberedMatch[1]) };
    }

    // Check for bullet list (- or *)
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
        return { type: 'bullet', content: bulletMatch[1] };
    }

    return { type: null, content: line };
}

export function FormattedText({ children, style, baseColor }: FormattedTextProps) {
    const { colors } = useTheme();
    const textColor = baseColor || colors.textMuted;

    if (!children) return null;

    // Split by line breaks
    const lines = children.split('\n');

    const renderSegments = (segments: TextSegment[]) => {
        return segments.map((segment, i) => {
            let segmentStyle: TextStyle = {};

            if (segment.bold) {
                segmentStyle.fontFamily = fontFamilies.figtree.semiBold;
                segmentStyle.fontWeight = '600';
            }
            if (segment.italic) {
                segmentStyle.fontStyle = 'italic';
            }
            if (segment.code) {
                segmentStyle.fontFamily = 'monospace';
                segmentStyle.backgroundColor = colors.surface;
                segmentStyle.paddingHorizontal = 4;
                segmentStyle.borderRadius = 3;
            }

            return (
                <Text key={i} style={segmentStyle}>
                    {segment.text}
                </Text>
            );
        });
    };

    const renderLine = (line: string, index: number, isLast: boolean) => {
        const listItem = isListItem(line.trim());
        const segments = parseInlineFormatting(listItem.content || line);

        if (listItem.type === 'bullet') {
            return (
                <View key={index} style={styles.listItem}>
                    <Text style={[styles.bullet, { color: textColor }]}>•</Text>
                    <Text style={[styles.listText, style, { color: textColor }]}>
                        {renderSegments(segments)}
                    </Text>
                </View>
            );
        }

        if (listItem.type === 'number') {
            return (
                <View key={index} style={styles.listItem}>
                    <Text style={[styles.number, { color: textColor, fontFamily: fontFamilies.figtree.medium }]}>
                        {listItem.number}.
                    </Text>
                    <Text style={[styles.listText, style, { color: textColor }]}>
                        {renderSegments(segments)}
                    </Text>
                </View>
            );
        }

        // Regular line
        return (
            <Text key={index} style={[style, { color: textColor }]}>
                {renderSegments(segments)}
                {!isLast && '\n'}
            </Text>
        );
    };

    return (
        <Text style={[styles.container, style, { color: textColor }]}>
            {lines.map((line, index) => renderLine(line, index, index === lines.length - 1))}
        </Text>
    );
}

const styles = StyleSheet.create({
    container: {
        // Base container styles
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 2,
    },
    bullet: {
        width: 16,
        fontSize: 14,
        lineHeight: 20,
    },
    number: {
        width: 20,
        fontSize: 14,
        lineHeight: 20,
    },
    listText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
});
