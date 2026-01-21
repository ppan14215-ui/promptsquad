import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { SkillQuestion, SkillQuestionsConfig } from '@/services/admin';
import { Icon } from './Icon';
import { MiniButton } from './MiniButton';

type SkillQuestionsModalProps = {
  visible: boolean;
  skillLabel: string;
  questions: SkillQuestion[];
  onComplete: (answers: Record<string, string>) => void;
  onCancel: () => void;
};

export function SkillQuestionsModal({
  visible,
  skillLabel,
  questions,
  onComplete,
  onCancel,
}: SkillQuestionsModalProps) {
  const { colors } = useTheme();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const totalQuestions = questions.length;

  const handleChoiceSelect = (questionId: string, choice: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choice,
    }));
  };

  const handleTextInputChange = (questionId: string, value: string) => {
    setTextInputs((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    // Validate required question
    if (currentQuestion.required) {
      const answer = currentQuestion.type === 'choice' 
        ? answers[currentQuestion.id]
        : textInputs[currentQuestion.id];
      
      if (!answer || answer.trim() === '') {
        return; // Don't proceed if required question not answered
      }
    }

    // Save answer
    if (currentQuestion.type === 'text' && textInputs[currentQuestion.id]) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: textInputs[currentQuestion.id],
      }));
    }

    if (isLastQuestion) {
      // Combine all answers and complete
      const allAnswers: Record<string, string> = { ...answers };
      Object.entries(textInputs).forEach(([key, value]) => {
        if (value) {
          allAnswers[key] = value;
        }
      });
      onComplete(allAnswers);
      // Reset state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTextInputs({});
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      onCancel();
      // Reset state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTextInputs({});
    }
  };

  const currentAnswer = currentQuestion.type === 'choice'
    ? answers[currentQuestion.id]
    : textInputs[currentQuestion.id] || '';

  const canProceed = currentQuestion.required
    ? currentAnswer && currentAnswer.trim() !== ''
    : true;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.background,
              borderColor: colors.outline,
            },
            Platform.OS === 'web' && ({ boxShadow: shadowToCSS('lg') } as unknown as object),
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Icon name="idea" size={20} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.skillLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.text,
                  },
                ]}
              >
                {skillLabel}
              </Text>
              <Text
                style={[
                  styles.questionCount,
                  {
                    fontFamily: fontFamilies.figtree.medium,
                    color: colors.textMuted,
                  },
                ]}
              >
                Questions {currentQuestionIndex + 1} of {totalQuestions}
              </Text>
            </View>
          </View>

          {/* Question */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text
              style={[
                styles.questionLabel,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.text,
                },
              ]}
            >
              {currentQuestion.label}
              {currentQuestion.required && (
                <Text style={{ color: colors.error }}> *</Text>
              )}
            </Text>

            {currentQuestion.type === 'choice' ? (
              <View style={styles.choicesContainer}>
                {currentQuestion.choices?.map((choice: string, index: number) => {
                  const isSelected = answers[currentQuestion.id] === choice;
                  return (
                    <Pressable
                      key={index}
                      style={[
                        styles.choiceButton,
                        {
                          backgroundColor: isSelected
                            ? colors.primaryBg
                            : colors.surface,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.outline,
                        },
                      ]}
                      onPress={() => handleChoiceSelect(currentQuestion.id, choice)}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          {
                            fontFamily: fontFamilies.figtree.medium,
                            color: isSelected ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        {choice}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outline,
                    color: colors.text,
                    fontFamily: fontFamilies.figtree.regular,
                  },
                ]}
                placeholder={currentQuestion.placeholder || 'Enter your answer...'}
                placeholderTextColor={colors.textMuted}
                value={textInputs[currentQuestion.id] || ''}
                onChangeText={(value) => handleTextInputChange(currentQuestion.id, value)}
                multiline
                maxLength={500}
              />
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.outline }]}>
            <Pressable
              style={[
                styles.skipButton,
                {
                  borderColor: colors.outline,
                },
              ]}
              onPress={handleBack}
            >
              <Text
                style={[
                  styles.skipButtonText,
                  {
                    fontFamily: fontFamilies.figtree.medium,
                    color: colors.textMuted,
                  },
                ]}
              >
                {currentQuestionIndex === 0 ? 'Skip' : 'Back'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.continueButton,
                {
                  backgroundColor: canProceed ? colors.primary : colors.outline,
                  opacity: canProceed ? 1 : 0.5,
                },
              ]}
              onPress={handleNext}
              disabled={!canProceed}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: canProceed ? colors.buttonText : colors.textMuted,
                  },
                ]}
              >
                {isLastQuestion ? 'Continue' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 0 : 20,
  },
  modal: {
    width: Platform.OS === 'web' ? 500 : '100%',
    maxWidth: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  skillLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
  questionCount: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    maxHeight: 400,
  },
  questionLabel: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  choicesContainer: {
    gap: 12,
  },
  choiceButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  choiceText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent', // Will be set dynamically
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    lineHeight: 22,
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
