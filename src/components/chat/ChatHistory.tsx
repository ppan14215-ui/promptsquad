// Chat history component for displaying and navigating conversations

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';
import { useConversations, deleteConversation, togglePinConversation } from '@/services/chat-history';
import { Icon, LinkPill } from '@/components';
import { useMascotSkills, MascotSkill } from '@/services/admin';
import { logger } from '@/lib/utils/logger';

export type ChatHistoryProps = {
  mascotId?: string;
  onConversationPress: (conversationId: string) => void;
  onNewChat: () => void;
  onSkillPress?: (skill: MascotSkill | string) => void;
};

export function ChatHistory({ mascotId, onConversationPress, onNewChat, onSkillPress }: ChatHistoryProps) {
  const { colors } = useTheme();
  const { conversations, isLoading, refetch } = useConversations(mascotId);
  const { skills: dbSkills, isLoading: skillsLoading } = useMascotSkills(mascotId || '1');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);

  const handleDelete = async (conversationId: string, event: any) => {
    event?.stopPropagation?.(); // Prevent navigation when clicking delete
    
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(conversationId);
              await deleteConversation(conversationId);
              await refetch();
            } catch (error: any) {
              logger.error('[ChatHistory] Error deleting conversation:', error);
              const errorMessage = error?.message || 'Unknown error occurred';
              logger.error('[ChatHistory] Error details:', errorMessage);
              Alert.alert(
                'Error', 
                `Failed to delete conversation: ${errorMessage}\n\nCheck the browser console for more details.`
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleTogglePin = async (conversationId: string, currentPinned: boolean, event: any) => {
    event?.stopPropagation?.(); // Prevent navigation when clicking pin
    
    try {
      setPinningId(conversationId);
      await togglePinConversation(conversationId, !currentPinned);
      await refetch();
    } catch (error) {
      logger.error('[ChatHistory] Error toggling pin:', error);
      Alert.alert('Error', 'Failed to update conversation. Please try again.');
    } finally {
      setPinningId(null);
    }
  };

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
          {/* Show skills when no conversations */}
          {onSkillPress && (dbSkills.length > 0 || mascotId) && (
            <View style={styles.skillsSection}>
              <Text
                style={[
                  styles.skillsTitle,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.text,
                  },
                ]}
              >
                Or start with a skill:
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.skillsContent}
              >
                {skillsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : dbSkills.length > 0 ? (
                  dbSkills.map((skill) => (
                    <LinkPill
                      key={skill.id}
                      label={skill.skill_label}
                      onPress={() => onSkillPress(skill)}
                    />
                  ))
                ) : null}
              </ScrollView>
            </View>
          )}
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
                item.is_pinned && { backgroundColor: colors.surface + '80' }, // Slightly different background for pinned
              ]}
            >
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
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
                  {item.is_pinned && (
                    <Icon name="favourite-filled" size={14} color={colors.primary} style={styles.pinIcon} />
                  )}
                </View>
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
              <View style={styles.conversationActions}>
                <Pressable
                  onPress={(e) => handleTogglePin(item.id, item.is_pinned || false, e)}
                  style={styles.actionButton}
                  disabled={pinningId === item.id}
                >
                  {pinningId === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Icon 
                      name={item.is_pinned ? "favourite-filled" : "favourite"} 
                      size={18} 
                      color={item.is_pinned ? colors.primary : colors.textMuted} 
                    />
                  )}
                </Pressable>
                <Pressable
                  onPress={(e) => handleDelete(item.id, e)}
                  style={styles.actionButton}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.error || '#FF3B30'} />
                  ) : (
                    <Icon name="delete" size={18} color={colors.textMuted} />
                  )}
                </Pressable>
                <Icon name="chevron-right" size={20} color={colors.textMuted} style={styles.chevronIcon} />
              </View>
            </Pressable>
          )}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}
      
      {/* Skills section at bottom - always visible */}
      {onSkillPress && (dbSkills.length > 0 || mascotId) && (
        <View style={[styles.skillsSection, { borderTopColor: colors.outline }]}>
          <Text
            style={[
              styles.skillsTitle,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: colors.text,
              },
            ]}
          >
            Start with a skill:
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.skillsContent}
          >
            {skillsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : dbSkills.length > 0 ? (
              dbSkills.map((skill) => (
                <LinkPill
                  key={skill.id}
                  label={skill.skill_label}
                  onPress={() => onSkillPress(skill)}
                />
              ))
            ) : null}
          </ScrollView>
        </View>
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
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conversationTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  pinIcon: {
    marginLeft: 4,
  },
  pinBadge: {
    fontSize: 12,
    marginLeft: 4,
  },
  conversationDate: {
    fontSize: 12,
    lineHeight: 16,
  },
  conversationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  skillsSection: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  skillsTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  skillsContent: {
    flexDirection: 'row',
    gap: 8,
  },
});
