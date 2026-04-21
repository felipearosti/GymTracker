import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Body from 'react-native-body-highlighter';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/services/api';
import {
  LibSlug,
  LIB_LABEL_PT,
  fatigueColor,
  mapFatigueToLib,
} from '../../src/services/muscleMap';

type FatigueResponse = { fatigue: Record<string, number>; computedAt: string };

export default function BodyScreen() {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<LibSlug | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<FatigueResponse>('/api/body/fatigue');
      setData(res.fatigue ?? {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const libFatigue = useMemo(() => mapFatigueToLib(data), [data]);

  const bodyData = useMemo(
    () =>
      Object.entries(libFatigue)
        .filter(([, v]) => v > 0.02)
        .map(([slug, v]) => ({
          slug: slug as LibSlug,
          intensity: 2,
          color: fatigueColor(v),
        })),
    [libFatigue],
  );

  const sortedList = useMemo(
    () => Object.entries(libFatigue).sort((a, b) => b[1] - a[1]),
    [libFatigue],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor="#60a5fa"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Mapa de fadiga</Text>
        <Text style={styles.sub}>Quanto mais vermelho, mais recente/intenso o estímulo</Text>
      </View>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, side === 'front' && styles.toggleActive]}
          onPress={() => setSide('front')}
        >
          <Text style={[styles.toggleText, side === 'front' && styles.toggleActiveText]}>
            Frente
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, side === 'back' && styles.toggleActive]}
          onPress={() => setSide('back')}
        >
          <Text style={[styles.toggleText, side === 'back' && styles.toggleActiveText]}>
            Costas
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bodyWrap} collapsable={false}>
        <Body
          data={bodyData}
          side={side}
          scale={1.3}
          gender="male"
          border="#374151"
          onBodyPartPress={(p: any) => {
            const slug = p?.slug ?? p;
            if (typeof slug === 'string') setSelected(slug as LibSlug);
          }}
        />
      </View>

      {selected && (
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{LIB_LABEL_PT[selected] ?? selected}</Text>
          <Text style={styles.infoValue}>
            Fadiga: {((libFatigue[selected] ?? 0) * 100).toFixed(0)}%
          </Text>
        </View>
      )}

      <View style={styles.legend}>
        <LegendDot color="#22c55e" label="Recuperado" />
        <LegendDot color="#eab308" label="Residual" />
        <LegendDot color="#ef4444" label="Fadigado" />
      </View>

      {sortedList.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.listTitle}>Detalhe por grupo</Text>
          {sortedList.map(([slug, v]) => (
            <View key={slug} style={styles.row}>
              <View style={[styles.rowDot, { backgroundColor: fatigueColor(v) }]} />
              <Text style={styles.rowLabel}>{LIB_LABEL_PT[slug as LibSlug] ?? slug}</Text>
              <Text style={styles.rowVal}>{(v * 100).toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      )}

      {sortedList.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sem dados ainda.</Text>
          <Text style={styles.emptySub}>Faça um treino pra ver o mapa ganhar vida.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#f9fafb' },
  sub: { color: '#9ca3af', fontSize: 13, marginTop: 4 },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  toggleActive: { backgroundColor: '#2563eb' },
  toggleText: { color: '#9ca3af', fontWeight: '600', fontSize: 13 },
  toggleActiveText: { color: '#fff' },
  bodyWrap: { alignItems: 'center', marginVertical: 12 },
  infoCard: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  infoLabel: { color: '#f9fafb', fontWeight: '700', fontSize: 15 },
  infoValue: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendLabel: { color: '#9ca3af', fontSize: 12 },
  list: { marginTop: 12 },
  listTitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  rowDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  rowLabel: { color: '#f9fafb', fontSize: 14, flex: 1 },
  rowVal: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
  emptySub: { color: '#6b7280', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
