import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import StoriesBar from '../../components/StoriesBar';
import JobCard from '../../components/JobCard';
import { useAuth } from '../../context/AuthContext';
import { useStories } from '../../context/StoriesContext';
import { api } from '../../api/client';
import { colors, spacing } from '../../theme/colors';

export default function HomeFeedScreen({ navigation }) {
  const { user } = useAuth();
  const { stories, refresh: refreshStories } = useStories();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const { jobs: fetched } = await api.get('/jobs');
      setJobs(fetched);
    } catch (err) {
      console.warn('Falha ao carregar vagas:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
      refreshStories();
    }, [loadJobs, refreshStories])
  );

  function onRefresh() {
    setRefreshing(true);
    loadJobs();
    refreshStories();
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Emprego Já" />
      <StoriesBar
        stories={stories}
        currentUser={user}
        onAddStory={() => navigation.navigate('AddStory')}
        onOpenUserStories={(group) => navigation.navigate('StoryViewer', { group })}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Ainda não há vagas publicadas. Volte mais tarde.</Text>
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
  grid: { padding: spacing.xs },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
});
