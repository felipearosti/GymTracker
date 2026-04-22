import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/services/api';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string };
type Preset = { id: string; prompt: string };
type Limits = { used: number; limit: number; remaining: number };

const PRESET_LABELS: Record<string, string> = {
  analyze_last: '📊 Analisar última sessão',
  suggest_weights: '💪 Sugerir pesos',
  stagnation: '😮‍💨 Estou estagnado',
  weekly_review: '📅 Balanço da semana',
};

export default function CoachScreen() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [limits, setLimits] = useState<Limits>({ used: 0, limit: 10, remaining: 10 });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const loadAll = useCallback(async () => {
    try {
      const [h, p, l] = await Promise.all([
        api.get<Msg[]>('/api/coach/history'),
        api.get<Preset[]>('/api/coach/presets'),
        api.get<Limits>('/api/coach/limits'),
      ]);
      setMessages(h);
      setPresets(p);
      setLimits(l);
    } catch {
      // silencioso
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length, sending]);

  const send = async (payload: { message?: string; presetId?: string }) => {
    if (sending) return;
    if (limits.remaining <= 0) {
      Alert.alert('Limite atingido', `Você usou ${limits.used}/${limits.limit} mensagens hoje. Volta amanhã.`);
      return;
    }
    setSending(true);
    const optimisticId = `tmp-${Date.now()}`;
    const optimisticContent = payload.presetId
      ? presets.find((p) => p.id === payload.presetId)?.prompt ?? '...'
      : payload.message ?? '';
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: 'user', content: optimisticContent, createdAt: new Date().toISOString() },
    ]);
    setInput('');

    try {
      const resp = await api.post<{
        user: Msg;
        assistant: Msg;
        remaining: number;
      }>('/api/coach/message', payload);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticId),
        resp.user,
        resp.assistant,
      ]);
      setLimits((l) => ({ ...l, used: l.used + 1, remaining: resp.remaining }));
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      Alert.alert('Erro', e?.message ?? 'Falha no coach');
    } finally {
      setSending(false);
    }
  };

  const clearHistory = () => {
    Alert.alert('Limpar conversa?', 'Isso apaga todo o histórico do chat.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del('/api/coach/history');
            setMessages([]);
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Falha ao limpar');
          }
        },
      },
    ]);
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Coach 🤖</Text>
          <Text style={styles.sub}>
            {limits.remaining}/{limits.limit} mensagens restantes hoje
          </Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearHistory}>
            <Text style={styles.clearBtn}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.presets}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {presets.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.presetBtn, sending && styles.disabled]}
            onPress={() => send({ presetId: p.id })}
            disabled={sending}
          >
            <Text style={styles.presetText}>{PRESET_LABELS[p.id] ?? p.id}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Pergunte algo ou use um dos botões acima.</Text>
            <Text style={styles.emptySub}>Ex: "Qual peso fazer no supino hoje?"</Text>
          </View>
        )}
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === 'user' ? styles.bubbleUser : styles.bubbleCoach,
            ]}
          >
            <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextCoach}>
              {m.content}
            </Text>
          </View>
        ))}
        {sending && (
          <View style={[styles.bubble, styles.bubbleCoach]}>
            <ActivityIndicator size="small" color="#60a5fa" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Pergunte algo ao coach..."
          placeholderTextColor="#6b7280"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
          onSubmitEditing={() => input.trim() && send({ message: input.trim() })}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.disabled]}
          onPress={() => input.trim() && send({ message: input.trim() })}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendText}>{sending ? '...' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#f9fafb' },
  sub: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  clearBtn: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  presets: { maxHeight: 44, marginBottom: 6 },
  presetBtn: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  presetText: { color: '#e5e7eb', fontSize: 12, fontWeight: '600' },
  chat: { flex: 1 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  emptySub: { color: '#6b7280', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  bubble: { padding: 12, borderRadius: 12, maxWidth: '85%' },
  bubbleUser: { backgroundColor: '#2563eb', alignSelf: 'flex-end' },
  bubbleCoach: { backgroundColor: '#1f2937', alignSelf: 'flex-start' },
  bubbleTextUser: { color: '#fff', fontSize: 14, lineHeight: 20 },
  bubbleTextCoach: { color: '#f9fafb', fontSize: 14, lineHeight: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f9fafb',
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
