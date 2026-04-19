import { StyleSheet, Text, View } from 'react-native';

export function SearchShell({ lineCode }: { lineCode: string }) {
  return (
    <>
      <View style={styles.searchBar}>
        <View style={styles.searchIconShell}>
          <View style={styles.searchIconCircle} />
        </View>
        <Text style={styles.searchPrompt}>Where to?</Text>
        <View style={styles.avatarShell}>
          <Text style={styles.avatarText}>OC</Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        <View style={[styles.modeChip, styles.modeChipActive]}>
          <Text style={[styles.modeChipText, styles.modeChipTextActive]}>Metro</Text>
        </View>
        <View style={styles.modeChip}>
          <Text style={styles.modeChipText}>Line {lineCode}</Text>
        </View>
        <View style={styles.modeChip}>
          <Text style={styles.modeChipText}>Realtime</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(9, 18, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchPrompt: {
    color: '#F5F8FF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  searchIconShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  searchIconCircle: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#D7E5FF',
    borderRadius: 9,
  },
  avatarShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5D6BC',
  },
  avatarText: {
    color: '#24304A',
    fontSize: 12,
    fontWeight: '800',
  },
  modeRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  modeChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: 'rgba(9, 18, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeChipActive: {
    backgroundColor: '#2A70FF',
    borderColor: '#2A70FF',
  },
  modeChipText: {
    color: '#D5E2FF',
    fontWeight: '700',
    fontSize: 15,
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
});
