import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { ROLE_ACCENT, ScreenLoader } from '../../components/ui/state-views';
import { getStoredUser } from '../../services/auth';
import { askWorkAssistant, type WorkChatMessage } from '../../services/work-assistant';

/*
 * =========================================================
 * AI ASSISTANT — SELLER MODE / RIDER MODE
 * =========================================================
 *
 * Same Grok model as the Customer bouquet assistant, with a
 * role-specific guide and the user's live shop / delivery
 * data. It advises only; it never changes anything.
 * =========================================================
 */

type WorkRole = 'seller' | 'rider';

const TEXT = '#2D2A2E';
const MUTED = '#6F6A70';

const SUGGESTIONS: Record<WorkRole, string[]> = {
  seller: [
    'What orders need my attention right now?',
    'How much will my next payout be?',
    'What are customers complaining about in reviews?',
    'Which items should I bundle together?',
  ],
  rider: [
    'What should I do next with my deliveries?',
    'How much COD do I still need to remit?',
    'When is my next shift?',
    'How do I report a customer who is not answering?',
  ],
};

const INTRO: Record<WorkRole, string> = {
  seller:
    'Hi! I am your FLOGRAM Seller Assistant. I can see your orders, products, earnings and review insights. Ask me anything about running your shop.',
  rider:
    'Hi! I am your FLOGRAM Rider Assistant. I can see your active deliveries, shift and COD status. Ask me anything — but please do not type while driving.',
};

export default function WorkAssistantScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [role, setRole] = useState<WorkRole | null>(null);
  const [messages, setMessages] = useState<WorkChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void getStoredUser().then(user => {
      if (user?.role === 'seller' || user?.role === 'rider') {
        setRole(user.role);
      } else {
        router.back();
      }
    });
  }, []);

  if (!role) {
    return <ScreenLoader role="seller" />;
  }

  const accent = ROLE_ACCENT[role];

  const ask = async (text: string) => {
    const question = text.trim();

    if (!question || sending) return;

    const history = messages;
    setMessages([...history, { role: 'user', content: question }]);
    setInput('');
    setSending(true);

    try {
      const result = await askWorkAssistant(question, history);
      setMessages(current => [...current, { role: 'assistant', content: result.reply }]);
    } catch (error) {
      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: `Sorry, I could not answer right now. ${error instanceof Error ? error.message : ''}`.trim(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role={role}
        title={role === 'seller' ? 'Seller Assistant' : 'Rider Assistant'}
        subtitle="AI help using your live FLOGRAM data"
        right={
          messages.length ? (
            <Pressable
              accessibilityLabel="Start a new chat"
              onPress={() => setMessages([])}
              style={styles.headerButton}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </Pressable>
          ) : null
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.bubble, styles.assistant]}>
            <Text style={styles.bubbleText}>{INTRO[role]}</Text>
          </View>

          {messages.length === 0 ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS[role].map(suggestion => (
                <Pressable
                  key={suggestion}
                  onPress={() => void ask(suggestion)}
                  style={[styles.suggestion, { borderColor: accent }]}
                >
                  <Text style={[styles.suggestionText, { color: accent }]}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {messages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={[
                styles.bubble,
                message.role === 'user' ? [styles.user, { backgroundColor: accent }] : styles.assistant,
              ]}
            >
              <Text style={[styles.bubbleText, message.role === 'user' && { color: '#FFFFFF' }]}>
                {message.content}
              </Text>
            </View>
          ))}

          {sending ? (
            <View style={[styles.bubble, styles.assistant, { flexDirection: 'row', gap: 8 }]}>
              <ActivityIndicator color={accent} />
              <Text style={styles.muted}>Checking your data...</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask the assistant..."
            placeholderTextColor="#A9A3AA"
            multiline
            maxLength={1500}
            style={styles.input}
          />
          <Pressable
            accessibilityLabel="Send"
            disabled={sending || !input.trim()}
            onPress={() => void ask(input)}
            style={[styles.send, { backgroundColor: accent }, (sending || !input.trim()) && { opacity: 0.5 }]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F8' },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  content: { padding: 16, gap: 10 },
  bubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  assistant: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE8ED' },
  user: { alignSelf: 'flex-end' },
  bubbleText: { color: TEXT, fontSize: 15, lineHeight: 21 },
  muted: { color: MUTED, fontSize: 13 },
  suggestions: { gap: 8 },
  suggestion: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, backgroundColor: '#FFFFFF' },
  suggestionText: { fontSize: 13, fontWeight: '700' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ECE8ED',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 22,
    color: TEXT,
    fontSize: 15,
    backgroundColor: '#F4F2F5',
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
