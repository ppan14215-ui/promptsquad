import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';



// Tailored steps based on context
const CODING_STEPS = [
    'Analyzing requirements...',
    'Checking syntax constraints...',
    'Reviewing best practices...',
    'Structuring code logic...',
    'Optimizing performance...',
    'Finalizing implementation...',
];

const CREATIVE_STEPS = [
    'Brainstorming ideas...',
    'Exploring creative angles...',
    'Drafting narrative arc...',
    'Refining tone and voice...',
    'Polishing output...',
];

const ANALYSIS_STEPS = [
    'Processing data...',
    'Identifying patterns...',
    'comparing key metrics...',
    'Synthesizing insights...',
    'Formatting results...',
];

const IMAGE_STEPS = [
    'Visualizing concept...',
    'Composing scene structure...',
    'Balancing color palette...',
    'Rendering details...',
    'Finalizing imagery...',
];

const WEB_STEPS = [
    'Scanning web sources...',
    'Verifying facts...',
    'Cross-referencing data...',
    'Summarizing findings...',
    'Citing sources...',
];

const GENERIC_STEPS = [
    'Deconstructing prompt...',
    'Identifying key constraints...',
    'Retrieving relevant context...',
    'Analyzing request parameters...',
    'Formulating response strategy...',
    'Generating content...',
    'Refining output...',
];

const DEEP_THINKING_STEPS = [
    'Initializing deep reasoning...',
    'Exploring solution paths...',
    'Verifying logical consistency...',
    'Cross-checking facts...',
    'Synthesizing complex information...',
    'Optimizing answer structure...',
    'Finalizing comprehensive response...',
];

type ChainOfThoughtProps = {
    status?: string | null; // Real status from backend
    isDeepThinking?: boolean;
    contextPrompt?: string; // The user's prompt to tailor thoughts to
};

export function ChainOfThought({ status, isDeepThinking = false, contextPrompt }: ChainOfThoughtProps) {
    const { colors } = useTheme();
    // Animation value for opacity/transform
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(10)).current;

    // Determine steps based on context
    const getStepsForContext = (prompt?: string) => {
        if (isDeepThinking) return DEEP_THINKING_STEPS;
        if (!prompt) return GENERIC_STEPS;

        const p = prompt.toLowerCase();

        // Heuristic matching
        if (p.includes('image') || p.includes('picture') || p.includes('draw') || p.includes('photo')) return IMAGE_STEPS;
        if (p.includes('code') || p.includes('function') || p.includes('app') || p.includes('script') || p.includes('api')) return CODING_STEPS;
        if (p.includes('analyze') || p.includes('data') || p.includes('chart') || p.includes('report')) return ANALYSIS_STEPS;
        if (p.includes('story') || p.includes('poem') || p.includes('write') || p.includes('blog')) return CREATIVE_STEPS;
        if (p.includes('search') || p.includes('news') || p.includes('latest') || p.includes('find')) return WEB_STEPS;

        return GENERIC_STEPS;
    };

    const [steps, setSteps] = useState(() => getStepsForContext(contextPrompt));

    // Local state for simulated steps
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [displayStatus, setDisplayStatus] = useState(status || steps[0]);

    // Update steps if context changes
    useEffect(() => {
        setSteps(getStepsForContext(contextPrompt));
    }, [contextPrompt, isDeepThinking]);

    // If real status updates, use it. Otherwise cycle through simulated steps.
    useEffect(() => {
        if (status) {
            animateTransition(status);
        }
    }, [status]);

    // Cycle simulated steps if no real status is provided (or if status is just generic)
    useEffect(() => {
        if (status) return; // Don't simulate if we have real status

        let timeout: NodeJS.Timeout;

        const cycleStep = () => {
            // Randomize delay slightly for realism (1.5s - 2.5s)
            const delay = Math.floor(Math.random() * 1000) + 1500;

            timeout = setTimeout(() => {
                setCurrentStepIndex((prev) => {
                    const nextIndex = (prev + 1) % steps.length;
                    animateTransition(steps[nextIndex]);
                    return nextIndex;
                });
                cycleStep();
            }, delay);
        };

        // Initial animation
        // animateTransition(steps[0]); // Don't animate first one, just set it
        setDisplayStatus(steps[0]);
        cycleStep();

        return () => clearTimeout(timeout);
    }, [status, steps]);

    const animateTransition = (newText: string) => {
        // Fade out
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad),
            }),
            Animated.timing(slideAnim, {
                toValue: -5,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad),
            })
        ]).start(() => {
            setDisplayStatus(newText);
            slideAnim.setValue(10); // Reset slide position to below

            // Fade in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(1.5)), // Slight bounce
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(1.5)),
                })
            ]).start();
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                {/* Pulsing Dot Effect */}
                <LoadingDots color={colors.primary} />
            </View>
            <Animated.Text
                style={[
                    styles.text,
                    {
                        color: colors.textMuted,
                        fontFamily: fontFamilies.figtree.medium,
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
            >
                {displayStatus}
            </Animated.Text>
        </View>
    );
}

// Simple pulsing dots component
const LoadingDots = ({ color }: { color: string }) => {
    const opacity1 = useRef(new Animated.Value(0.3)).current;
    const opacity2 = useRef(new Animated.Value(0.3)).current;
    const opacity3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animate = (anim: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 600, // Slightly slower for smoother feel
                        delay: delay,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease), // Smooth ease in/out
                    }),
                    Animated.timing(anim, {
                        toValue: 0.3,
                        duration: 600,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    })
                ])
            ).start();
        };

        // Staggered start
        animate(opacity1, 0);
        animate(opacity2, 150); // Tighter stagger
        animate(opacity3, 300);
    }, []);

    return (
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
            <Animated.View style={[styles.dot, { backgroundColor: color, opacity: opacity1 }]} />
            <Animated.View style={[styles.dot, { backgroundColor: color, opacity: opacity2 }]} />
            <Animated.View style={[styles.dot, { backgroundColor: color, opacity: opacity3 }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 10,
    },
    iconContainer: {
        width: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 13,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    }
});
