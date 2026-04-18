import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { Link, Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { PloggMap } from '../components/Map';

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  if (!isLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  return (
    <View style={styles.root}>
      <PloggMap />
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.chip}>
          <Text style={styles.chipText}>Plogg It</Text>
        </View>
        <View style={styles.chip}>
          {email ? <Text style={styles.chipTextMuted}>{email}</Text> : null}
          <Button label="Sign out" variant="ghost" onPress={() => clerk.signOut()} />
        </View>
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} style={styles.bottomBar} pointerEvents="box-none">
        <Link href={'/report' as never} asChild>
          <Pressable style={styles.fab}>
            <Text style={styles.fabText}>+ Report trash</Text>
          </Pressable>
        </Link>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipTextMuted: { fontSize: 12, color: '#00000099' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 12,
  },
  fab: {
    backgroundColor: '#2e8b57',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  fabText: { color: 'white', fontWeight: '600', fontSize: 15 },
});
