import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import JobCard from '../../components/JobCard';
import FormField from '../../components/FormField';
import ChipSelect from '../../components/ChipSelect';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { colors, radius, spacing } from '../../theme/colors';
import { AVAILABILITY_OPTIONS } from '../../constants';

export default function SearchJobsScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [profession, setProfession] = useState('');
  const [location, setLocation] = useState('');
  const [availability, setAvailability] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (profession.trim()) params.set('profession', profession.trim());
      if (location.trim()) params.set('location', location.trim());
      if (availability) params.set('availability', availability);
      if (minSalary) params.set('minSalary', minSalary);
      if (verifiedOnly) params.set('verifiedOnly', 'true');
      const { jobs: fetched } = await api.get(`/jobs?${params.toString()}`);
      setJobs(fetched);
    } catch (err) {
      console.warn('Falha na pesquisa:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setProfession('');
    setLocation('');
    setAvailability('');
    setMinSalary('');
    setVerifiedOnly(false);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Procurar vagas" />

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Título, sector, palavra-chave..."
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters((s) => !s)}>
          <Ionicons name="options-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {showFilters ? (
        <View style={styles.filterPanel}>
          <FormField label="Profissão / sector" value={profession} onChangeText={setProfession} placeholder="Ex: Motorista" />
          <FormField label="Localização" value={location} onChangeText={setLocation} placeholder="Ex: Beira" />
          <ChipSelect label="Disponibilidade" options={AVAILABILITY_OPTIONS} value={availability} onChange={(v) => setAvailability(v || '')} />
          <FormField
            label="Salário mínimo (MZN)"
            value={minSalary}
            onChangeText={(v) => setMinSalary(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="Ex: 5000"
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Apenas verificados</Text>
            <Switch value={verifiedOnly} onValueChange={setVerifiedOnly} trackColor={{ true: colors.teal }} />
          </View>
          <View style={styles.filterActions}>
            <Button title="Limpar" variant="ghost" onPress={clearFilters} style={{ flex: 1, marginRight: spacing.sm }} />
            <Button title="Aplicar filtros" onPress={runSearch} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            searched ? (
              <Text style={styles.empty}>Nenhuma vaga encontrada com estes critérios.</Text>
            ) : (
              <Text style={styles.empty}>Pesquise por vagas ou use os filtros.</Text>
            )
          }
          renderItem={({ item }) => (
            <JobCard job={item} onPress={() => navigation.navigate('JobDetail', { jobId: item.id })} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterActions: {
    flexDirection: 'row',
  },
  grid: { padding: spacing.xs },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
});
