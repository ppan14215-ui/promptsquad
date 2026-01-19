// Chat history service for managing conversations and messages

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';

export type Conversation = {
  id: string;
  user_id: string;
  mascot_id: string;
  title: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
};

/**
 * Create a new conversation
 */
export async function createConversation(
  mascotId: string,
  initialTitle?: string
): Promise<Conversation> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: session.user.id,
      mascot_id: mascotId,
      title: initialTitle || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[ChatHistory] Error creating conversation:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Save a message to a conversation
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  model?: string,
  tokensUsed?: number
): Promise<ConversationMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      model: model || null,
      tokens_used: tokensUsed || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[ChatHistory] Error saving message:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(mascotId?: string): Promise<Conversation[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return [];
  }

  let query = supabase
    .from('conversations')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (mascotId) {
    query = query.eq('mascot_id', mascotId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ChatHistory] Error fetching conversations:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all messages for a conversation
 */
export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ChatHistory] Error fetching messages:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate a conversation title using AI
 * This analyzes the conversation content and creates a meaningful name
 */
export async function generateConversationTitle(
  conversationId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  // Get first few messages to analyze
  const firstMessages = messages.slice(0, 6); // First 3 exchanges
  const conversationText = firstMessages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  // Create a prompt to generate a title
  const titlePrompt = `Based on this conversation, generate a short, descriptive title (max 60 characters) that captures the main topic or purpose. Do NOT use generic terms like "New Chat", "Chat", or skill names. Instead, create a specific title that reflects what is actually being discussed.

Conversation:
${conversationText}

Generate only the title, nothing else:`;

  try {
    // Use secureChat to get AI-generated title
    const { secureChat } = await import('@/services/ai/secure-chat');
    
    // Use a simple mascot (first one) for title generation
    // We don't have mascot context here, but we can use a default
    const response = await secureChat(
      '1', // Default mascot for title generation
      [
        { role: 'user', content: titlePrompt }
      ],
      undefined, // No conversationId for title generation
      undefined, // No skillId
      'openai', // Use OpenAI for reliable title generation
      false // No deep thinking needed for titles
    );

    let title = response.content.trim();
    
    // Clean up the title (remove quotes, limit length)
    title = title.replace(/^["']|["']$/g, '').trim();
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    // Update the conversation with the generated title
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId);

    if (updateError) {
      console.error('[ChatHistory] Error updating conversation title:', updateError);
    }

    return title || 'New Conversation';
  } catch (error) {
    console.error('[ChatHistory] Error generating title:', error);
    // Fallback: create a title from first user message
    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (firstUserMessage) {
      const fallbackTitle = firstUserMessage.content.substring(0, 50).trim();
      await supabase
        .from('conversations')
        .update({ title: fallbackTitle || 'New Conversation' })
        .eq('id', conversationId);
      return fallbackTitle || 'New Conversation';
    }
    return 'New Conversation';
  }
}

/**
 * React hook to get conversations
 */
export function useConversations(mascotId?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getConversations(mascotId).then((data) => {
      setConversations(data);
      setIsLoading(false);
    });
  }, [user, mascotId]);

  const refetch = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    getConversations(mascotId).then((data) => {
      setConversations(data);
      setIsLoading(false);
    });
  }, [user, mascotId]);

  return { conversations, isLoading, refetch };
}

/**
 * React hook to get conversation messages
 */
export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getConversationMessages(conversationId).then((data) => {
      setMessages(data);
      setIsLoading(false);
    });
  }, [conversationId]);

  return { messages, isLoading };
}
