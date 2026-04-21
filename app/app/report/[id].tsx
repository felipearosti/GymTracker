import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { SessionReport } from '../../src/types';

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<SessionReport>(`/api/sessions/${id}/report`);
      setReport(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o relatório.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!report) return null;

  const volumeKg = Math.round(report.currentVolume);
  const delta = report.volumeDelta;
  const deltaPercent = report.volumeDeltaPercent;

  const MUSCLE_PT: Record<string, string> = {
    chest: 'Peito',
    upper_chest: 'Peito superior',
    lower_chest: 'Peito inferior',
    back: 'Costas',
    lats: 'Dorsais',
    traps: 'Trapézio',
    upper_back: 'Costas superior',
    lower_back: 'Lombar',
    rhomboids: 'Romboides',
    shoulders: 'Ombros',
    front_delt: 'Deltoide anterior',
    side_delt: 'Deltoide lateral',
    rear_delt: 'Deltoide posterior',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    forearms: 'Antebraços',
    quads: 'Quadríceps',
    hamstrings: 'Posteriores',
    glutes: 'Glúteos',
    calves: 'Panturrilhas',
    adductors: 'Adutores',
    abductors: 'Abdutores',
    abs: 'Abdômen',
    core: 'Core',
    obliques: 'Oblíquos',
    lower_abs: 'Abdômen inferior',
  };
  const muscleLabel = (m: string) =>
    MUSCLE_PT[m] ?? m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Treino {report.session.workout.code} concluído ✨</Text>
        <Text style={styles.meta}>
          {formatDuration(report.durationMs)} · {report.session.workout.exercises?.length ?? 0} exercícios
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Volume total</Text>
        <Text style={styles.volumeValue}>{volumeKg.toLocaleString('pt-BR')} kg</Text>
        {delta != null && deltaPercent != null && (
          <Text style={[styles.delta, delta >= 0 ? styles.deltaPos : styles.deltaNeg]}>
            {delta >= 0 ? '+' : ''}{Math.round(delta).toLocaleString('pt-BR')} kg vs sessão anterior ({deltaPercent.toFixed(1)}%)
          </Text>
        )}
      </View>

      {report.progressions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progressões</Text>
          {report.progressions.map((p, i) => (
            <View key={i} style={styles.progressionRow}>
              <Text style={styles.progressionCheck}>✅</Text>
              <Text style={styles.progressionText}>
                {p.exercise}: <Text style={styles.progressionChange}>{p.change}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {report.stagnations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estagnações</Text>
          {report.stagnations.map((s, i) => (
            <View key={i} style={styles.progressionRow}>
              <Text style={styles.progressionCheck}>⚠️</Text>
              <Text style={styles.progressionText}>
                {s.exercise}: <Text style={styles.stagnationNote}>{s.note}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {Object.keys(report.muscleVolume).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume por músculo</Text>
          {Object.entries(report.muscleVolume)
            .sort((a, b) => b[1] - a[1])
            .map(([muscle, vol]) => (
              <View key={muscle} style={styles.muscleRow}>
                <Text style={styles.muscleName}>{muscleLabel(muscle)}</Text>
                <Text style={styles.muscleVol}>{Math.round(vol).toLocaleString('pt-BR')} kg</Text>
              </View>
            ))}
        </View>
      )}

      <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/')}>
        <Text style={styles.homeBtnText}>Voltar ao início</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  content: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#f9fafb' },
  meta: { color: '#9ca3af', fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: '#1f2937', borderRadius: 14, padding: 20, marginBottom: 20,
  },
  cardLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  volumeValue: { color: '#f9fafb', fontSize: 36, fontWeight: '700' },
  delta: { fontSize: 14, marginTop: 4 },
  deltaPos: { color: '#4ade80' },
  deltaNeg: { color: '#f87171' },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#9ca3af', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  progressionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressionCheck: { fontSize: 16, marginRight: 8 },
  progressionText: { color: '#f9fafb', fontSize: 14, flex: 1 },
  progressionChange: { color: '#4ade80', fontWeight: '600' },
  stagnationNote: { color: '#fbbf24' },
  muscleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1f2937',
  },
  muscleName: { color: '#9ca3af', fontSize: 13 },
  muscleVol: { color: '#f9fafb', fontSize: 13 },
  homeBtn: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 16,
  },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
