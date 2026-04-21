import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { Session } from '../../src/types';

const WORKOUT_CODES = ['A', 'B', 'C', 'D', 'E'];

function formatDuration(ms: number) {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Session[]>('/api/sessions?limit=50');
      setSessions(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter ? sessions.filter((s) => s.workout?.code === filter) : sessions;

  const deleteSession = (id: string) => {
    Alert.alert(
      'Excluir sessão?',
      'Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.del(`/api/sessions/${id}`);
              setSessions((prev) => prev.filter((s) => s.id !== id));
            } catch (e: any) {
              Alert.alert('Erro ao excluir', e?.message ?? 'Falha desconhecida. Verifique se o backend foi reiniciado.');
            }
          },
        },
      ]
    );
  };


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.hint}>Toque e segure pra excluir</Text>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === null && styles.filterActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.filterText, filter === null && styles.filterActiveText]}>Todos</Text>
        </TouchableOpacity>
        {WORKOUT_CODES.map((code) => (
          <TouchableOpacity
            key={code}
            style={[styles.filterBtn, filter === code && styles.filterActive]}
            onPress={() => setFilter(code === filter ? null : code)}
          >
            <Text style={[styles.filterText, filter === code && styles.filterActiveText]}>{code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum treino registrado ainda.</Text>
          <Text style={styles.emptySubtext}>Vá para a aba Início e inicie seu primeiro treino!</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                if (item.finishedAt) router.push(`/report/${item.id}`);
                else deleteSession(item.id);
              }}
              onLongPress={() => deleteSession(item.id)}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardCode}>{item.workout?.code ?? '?'}</Text>
              </View>
              <View style={styles.cardMid}>
                <Text style={styles.cardName}>{item.workout?.name ?? 'Treino'}</Text>
                <Text style={styles.cardDate}>{formatDate(item.startedAt)}</Text>
              </View>
              <View style={styles.cardRight}>
                {item.durationMs ? (
                  <Text style={styles.cardDuration}>{formatDuration(item.durationMs)}</Text>
                ) : (
                  <Text style={styles.cardInProgress}>Em andamento</Text>
                )}
                {item.totalVolume ? (
                  <Text style={styles.cardVolume}>{Math.round(item.totalVolume).toLocaleString('pt-BR')} kg</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  header: {
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#f9fafb' },
  hint: { color: '#6b7280', fontSize: 11, fontStyle: 'italic' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  filterActiveText: { color: '#fff' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#f9fafb', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 8 },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: {
    width: 44,
    height: 44,
    backgroundColor: '#374151',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardCode: { color: '#60a5fa', fontWeight: '700', fontSize: 18 },
  cardMid: { flex: 1 },
  cardName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  cardDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardDuration: { color: '#9ca3af', fontSize: 13 },
  cardInProgress: { color: '#fbbf24', fontSize: 12 },
  cardVolume: { color: '#6b7280', fontSize: 12, marginTop: 2 },
});
