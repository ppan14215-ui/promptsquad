// Chat history service for managing conversations and messages

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';
import { createNamedLogger } from '@/lib/utils/logger';

const logger = createNamedLogger('ChatHistory');

export type Conversation = {
  id: string;
  user_id: string;
  mascot_id: string;
  title: string | null;
  is_archived: boolean;
  is_pinned: boolean;
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

  const { data, error } = await (supabase
    .from('conversations')
    .insert({
      user_id: session.user.id,
      mascot_id: mascotId,
      title: initialTitle || null,
    } as any)
    .select()
    .single() as any);

  if (error) {
    logger.error('Error creating conversation:', error);
    // Don't expose internal error details to user
    throw new Error('Failed to create conversation. Please try again.');
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
  const { data, error } = await (supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      model: model || null,
      tokens_used: tokensUsed || null,
    } as any)
    .select()
    .single() as any);

  if (error) {
    logger.error('Error saving message:', error);
    // Don't expose internal error details to user
    throw new Error('Failed to save message. Please try again.');
  }

  // Update conversation's updated_at timestamp so it appears in recent history
  // This ensures the conversation shows up in the history list
  try {
    await ((supabase
      .from('conversations') as any)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId));
  } catch (updateError) {
    // Don't fail if update fails, but log it
    logger.warn('Failed to update conversation timestamp:', updateError);
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

  // Build query - explicitly select columns to avoid issues with missing is_pinned column
  // If is_pinned doesn't exist, it will just be undefined and we'll default it to false
  let query = supabase
    .from('conversations')
    .select('id, user_id, mascot_id, title, is_archived, is_pinned, created_at, updated_at')
    .eq('user_id', session.user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (mascotId) {
    query = query.eq('mascot_id', mascotId);
  }

  const { data, error } = await query as any;

  if (error) {
    logger.error('Error fetching conversations:', error);
    // If error is about missing is_pinned column, try selecting without it
    if (error.message?.includes('is_pinned') || error.code === '42703') {
      logger.warn('is_pinned column missing, fetching without it');
      const fallbackQuery = supabase
        .from('conversations')
        .select('id, user_id, mascot_id, title, is_archived, created_at, updated_at')
        .eq('user_id', session.user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      
      if (mascotId) {
        fallbackQuery.eq('mascot_id', mascotId);
      }
      
      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        logger.error('Error fetching conversations (fallback):', fallbackError);
        return [];
      }
      // Add default is_pinned: false for conversations that don't have it
      return (fallbackData || []).map((conv: any) => ({ ...conv, is_pinned: false }));
    }
    return [];
  }

  // Ensure is_pinned exists (default to false if migration not applied)
  const conversations = (data || []).map((conv: any) => ({ 
    ...conv, 
    is_pinned: conv.is_pinned ?? false 
  })) as Conversation[];
  
  // Sort by pinned status client-side (pinned first, then by updated_at)
  conversations.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    // Both have same pinned status, sort by updated_at (already sorted by DB, but ensure consistency)
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  
  return conversations;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  logger.log('Attempting to delete conversation:', conversationId);

  // First, verify the conversation exists and belongs to the user
  const { data: conversation, error: fetchError } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', conversationId)
    .eq('user_id', session.user.id)
    .single();

  if (fetchError || !conversation) {
    logger.error('Conversation not found or access denied:', fetchError);
    throw new Error('Conversation not found or you do not have permission to delete it.');
  }

  logger.log('Conversation verified, belongs to user');

  // Delete all messages in the conversation explicitly
  // This ensures RLS policies allow the deletion before CASCADE tries to do it
  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (messagesError) {
    logger.error('Error deleting messages:', messagesError);
    // Don't throw - try to delete conversation anyway, CASCADE might handle it
  } else {
    logger.log('Messages deleted successfully');
  }

  // Then delete the conversation
  const { data, error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', session.user.id)
    .select();

  if (error) {
    logger.error('Error deleting conversation:', error);
    // Don't expose internal error details to user
    throw new Error('Failed to delete conversation. Please try again.');
  }

  if (!data || data.length === 0) {
    logger.warn('No rows deleted - this should not happen after verification');
    throw new Error('Failed to delete conversation');
  }

  logger.log('Conversation deleted successfully');
}

/**
 * Pin or unpin a conversation
 */
export async function togglePinConversation(conversationId: string, isPinned: boolean): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  const { error } = await ((supabase
    .from('conversations') as any)
    .update({ is_pinned: isPinned })
    .eq('id', conversationId)
    .eq('user_id', session.user.id)); // Ensure user can only pin their own conversations

  if (error) {
    logger.error('Error toggling pin:', error);
    // Don't expose internal error details to user
    throw new Error('Failed to update conversation. Please try again.');
  }
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
    logger.error('Error fetching messages:', error);
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
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  mascotId?: string
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
    // Get the mascot_id from the conversation if not provided
    let actualMascotId = mascotId;
    if (!actualMascotId) {
      const { data: convData } = await ((supabase
        .from('conversations') as any)
        .select('mascot_id')
        .eq('id', conversationId)
        .single());
      actualMascotId = ((convData as any)?.mascot_id as string | undefined) || '1'; // Fallback to '1' if not found
    }
    
    if (!actualMascotId) {
      actualMascotId = '1'; // Final fallback
    }
    
    // Use secureChat to get AI-generated title
    const { secureChat } = await import('@/services/ai/secure-chat');
    
    // Use the conversation's mascot for title generation (not a default)
    // This ensures the title matches the mascot's personality
    const response = await secureChat(
      actualMascotId, // Use the actual mascot for this conversation
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
    const { error: updateError } = await ((supabase
      .from('conversations') as any)
      .update({ title })
      .eq('id', conversationId));

    if (updateError) {
      logger.error('Error updating conversation title:', updateError);
    }

    return title || 'New Conversation';
  } catch (error) {
    logger.error('Error generating title:', error);
    // Fallback: create a title from first user message
    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (firstUserMessage) {
      const fallbackTitle = firstUserMessage.content.substring(0, 50).trim();
      await ((supabase
        .from('conversations') as any)
        .update({ title: fallbackTitle || 'New Conversation' })
        .eq('id', conversationId));
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
