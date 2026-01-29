import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const [webSearchEnabled, setWebSearchEnabled] = useState(true);
    const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
    const [llm, setLLM] = useState<LLMPreference>('auto');

    // Load from storage on mount
    useEffect(() => {
        AsyncStorage.getItem('chat_preferences').then(json => {
            if (json) {
                try {
                    const prefs = JSON.parse(json);
                    // Only set if valid boolean/string
                    if (typeof prefs.webSearchEnabled === 'boolean') setWebSearchEnabled(prefs.webSearchEnabled);
                    if (typeof prefs.deepThinkingEnabled === 'boolean') setDeepThinkingEnabled(prefs.deepThinkingEnabled);
                    if (typeof prefs.llm === 'string') setLLM(prefs.llm);
                } catch (e) {
                    console.error('Failed to parse chat preferences', e);
                }
            }
        });
    }, []);

    // Save to storage on change
    useEffect(() => {
        const prefs = { webSearchEnabled, deepThinkingEnabled, llm };
        AsyncStorage.setItem('chat_preferences', JSON.stringify(prefs)).catch(e => {
            console.error('Failed to save chat preferences', e);
        });
    }, [webSearchEnabled, deepThinkingEnabled, llm]);

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
