// Chat history component for displaying and navigating conversations

import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';
import { useConversations } from '@/services/chat-history';
import { Icon } from '@/components';

export type ChatHistoryProps = {
  mascotId?: string;
  onConversationPress: (conversationId: string) => void;
  onNewChat: () => void;
};

export function ChatHistory({ mascotId, onConversationPress, onNewChat }: ChatHistoryProps) {
  const { colors } = useTheme();
  const { conversations, isLoading, refetch } = useConversations(mascotId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.outline }]}>
        <Text
          style={[
            styles.title,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          Chat History
        </Text>
        <Pressable
          onPress={onNewChat}
          style={[styles.newChatButton, { backgroundColor: colors.primary }]}
        >
          <Icon name="plus" size={18} color="#FFFFFF" />
          <Text
            style={[
              styles.newChatText,
              {
                fontFamily: fontFamilies.figtree.medium,
                color: '#FFFFFF',
              },
            ]}
          >
            New Chat
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text
            style={[
              styles.loadingText,
              {
                fontFamily: fontFamilies.figtree.regular,
                color: colors.textMuted,
              },
            ]}
          >
            Loading conversations...
          </Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              {
                fontFamily: fontFamilies.figtree.regular,
                color: colors.textMuted,
              },
            ]}
          >
            No conversations yet. Start a new chat!
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onConversationPress(item.id)}
              style={[
                styles.conversationItem,
                { backgroundColor: colors.surface, borderBottomColor: colors.outline },
              ]}
            >
              <View style={styles.conversationContent}>
                <Text
                  style={[
                    styles.conversationTitle,
                    {
                      fontFamily: fontFamilies.figtree.semiBold,
                      color: colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title || 'New Conversation'}
                </Text>
                <Text
                  style={[
                    styles.conversationDate,
                    {
                      fontFamily: fontFamilies.figtree.regular,
                      color: colors.textMuted,
                    },
                  ]}
                >
                  {new Date(item.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
          )}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newChatText: {
    fontSize: 14,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  conversationDate: {
    fontSize: 12,
    lineHeight: 16,
  },
});
