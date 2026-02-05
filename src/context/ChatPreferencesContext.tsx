import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/services/auth';

import { LLMPreference } from '@/services/preferences';

type ChatPreferencesContextType = {
    webSearchEnabled: boolean;
    setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    deepThinkingEnabled: boolean;
    setDeepThinkingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    llm: LLMPreference;
    setLLM: React.Dispatch<React.SetStateAction<LLMPreference>>;
};

const ChatPreferencesContext = createContext<ChatPreferencesContextType | undefined>(undefined);

export function ChatPreferencesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth(); // Get current user
    const [webSearchEnabled, setWebSearchEnabled] = useState(true);
    const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
    const [llm, setLLM] = useState<LLMPreference>('auto');

    // Helper to get storage key based on user
    const getStorageKey = (key: string) => {
        if (user?.id) {
            return `chat_preferences_${user.id}_${key}`;
        }
        return `chat_preferences_guest_${key}`; // Fallback for guest/logged out
    };

    // Load from storage on mount or when user changes
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                // If user changes, reset to defaults first to avoid flash of previous user's state
                setWebSearchEnabled(true);
                setDeepThinkingEnabled(false);
                setLLM('auto');

                const json = await AsyncStorage.getItem(getStorageKey('settings'));
                if (json) {
                    const prefs = JSON.parse(json);

                    // Only set if valid types
                    if (typeof prefs.webSearchEnabled === 'boolean') {
                        setWebSearchEnabled(prefs.webSearchEnabled);
                    }
                    if (typeof prefs.deepThinkingEnabled === 'boolean') {
                        setDeepThinkingEnabled(prefs.deepThinkingEnabled);
                    }
                    if (typeof prefs.llm === 'string') {
                        setLLM(prefs.llm);
                    }
                }
            } catch (e) {
                console.error('Failed to parse chat preferences', e);
            }
        };

        loadPreferences();
    }, [user?.id]); // Re-run when user ID changes (login/logout)

    // Save to storage on change
    useEffect(() => {
        const savePreferences = async () => {
            try {
                const prefs = { webSearchEnabled, deepThinkingEnabled, llm };
                await AsyncStorage.setItem(getStorageKey('settings'), JSON.stringify(prefs));
            } catch (e) {
                console.error('Failed to save chat preferences', e);
            }
        };

        // Debounce slightly or just save
        savePreferences();
    }, [webSearchEnabled, deepThinkingEnabled, llm, user?.id]);

    return (
        <ChatPreferencesContext.Provider value={{
            webSearchEnabled, setWebSearchEnabled,
            deepThinkingEnabled, setDeepThinkingEnabled,
            llm, setLLM
        }}>
            {children}
        </ChatPreferencesContext.Provider>
    );
}

export function useChatPreferences() {
    const context = useContext(ChatPreferencesContext);
    if (!context) {
        throw new Error('useChatPreferences must be used within a ChatPreferencesProvider');
    }
    return context;
}
