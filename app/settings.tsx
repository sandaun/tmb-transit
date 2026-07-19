import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLegalSiteUrl } from '@/src/config/legal-links';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';
import type { AppLanguage, ThemePreference } from '@/src/features/preferences/models';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import { useAppLanguage } from '@/src/i18n';

const LANGUAGES: AppLanguage[] = ['ca', 'en', 'es'];
const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

interface SettingsRowProps {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
  trailing?: ReactNode;
  value?: string;
}

function SettingsRow({ icon, label, onPress, trailing, value }: SettingsRowProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable accessibilityRole="button" style={styles.settingsRow} onPress={onPress}>
      <MaterialIcons name={icon} size={21} color={palette.accent} />
      <View style={styles.settingsRowText}>
        <Text style={styles.settingsRowLabel}>{label}</Text>
        {value ? <Text style={styles.settingsRowValue}>{value}</Text> : null}
      </View>
      {trailing ?? <MaterialIcons name="chevron-right" size={22} color={palette.textSubtle} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { language, t } = useAppLanguage();
  const selectedLanguage = useUserPreferencesStore((state) => state.language) ?? language;
  const setLanguage = useUserPreferencesStore((state) => state.setLanguage);
  const theme = useUserPreferencesStore((state) => state.theme);
  const setTheme = useUserPreferencesStore((state) => state.setTheme);
  const clearPersonalData = useUserPreferencesStore((state) => state.clearPersonalData);
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber
    ?? String(Constants.expoConfig?.android?.versionCode ?? 1);
  const locationStatus = locationPermission?.status === 'granted'
    ? t('settings_location_granted')
    : locationPermission?.status === 'denied'
      ? t('settings_location_denied')
      : t('settings_location_undetermined');

  const handleLocationPress = async () => {
    try {
      if (!locationPermission || locationPermission.status === 'undetermined') {
        await requestLocationPermission();
        return;
      }
      await Linking.openSettings();
    } catch {
      Alert.alert(t('error_title'), t('error_body'));
    }
  };

  const confirmClearPersonalData = () => {
    Alert.alert(t('settings_delete_data_title'), t('settings_delete_data_body'), [
      { text: t('settings_cancel'), style: 'cancel' },
      { text: t('settings_delete'), style: 'destructive', onPress: clearPersonalData },
    ]);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <Text style={styles.sectionTitle}>{t('settings_preferences')}</Text>
      <View style={styles.card}>
        <Text style={styles.preferenceLabel}>{t('settings_language')}</Text>
        <View style={styles.segmentedRow}>
          {LANGUAGES.map((entry) => (
            <Pressable
              key={entry}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedLanguage === entry }}
              style={[
                styles.segmentButton,
                selectedLanguage === entry ? styles.segmentButtonActive : null,
              ]}
              onPress={() => setLanguage(entry)}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedLanguage === entry ? styles.segmentTextActive : null,
                ]}
              >
                {t(`language_${entry}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.preferenceLabel}>{t('settings_appearance')}</Text>
        <View style={styles.segmentedRow}>
          {THEMES.map((entry) => (
            <Pressable
              key={entry}
              accessibilityRole="button"
              accessibilityState={{ selected: theme === entry }}
              style={[styles.segmentButton, theme === entry ? styles.segmentButtonActive : null]}
              onPress={() => setTheme(entry)}
            >
              <Text style={[styles.segmentText, theme === entry ? styles.segmentTextActive : null]}>
                {t(`theme_${entry}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('settings_privacy_data')}</Text>
      <View style={styles.cardList}>
        <SettingsRow
          icon="location-on"
          label={t('settings_location')}
          value={locationStatus}
          onPress={() => void handleLocationPress()}
        />
        <SettingsRow
          icon="privacy-tip"
          label={t('settings_privacy_policy')}
          onPress={() => void Linking.openURL(getLegalSiteUrl(language, 'privacy'))}
          trailing={<MaterialIcons name="open-in-new" size={19} color={palette.accent} />}
        />
        <Pressable
          accessibilityRole="button"
          style={[styles.settingsRow, styles.dangerRow]}
          onPress={confirmClearPersonalData}
        >
          <MaterialIcons name="delete-outline" size={21} color={palette.danger} />
          <Text style={styles.dangerText}>{t('settings_delete_data')}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t('settings_information')}</Text>
      <View style={styles.cardList}>
        <SettingsRow
          icon="dataset"
          label={t('settings_data_sources')}
          onPress={() => router.push('/data-sources' as never)}
        />
        <SettingsRow
          icon="help-outline"
          label={t('settings_support')}
          onPress={() => void Linking.openURL(getLegalSiteUrl(language, 'support'))}
          trailing={<MaterialIcons name="open-in-new" size={19} color={palette.accent} />}
        />
      </View>

      <View style={styles.aboutCard}>
        <View style={styles.brandLockup}>
          <Image
            accessible={false}
            contentFit="contain"
            source={colorScheme === 'dark'
              ? require('../assets/images/moubcn-symbol-white.png')
              : require('../assets/images/moubcn-symbol-orange.png')}
            style={styles.brandSymbol}
          />
          <Text style={styles.aboutTitle}>MouBCN</Text>
        </View>
        <Text style={styles.aboutBody}>{t('settings_about_body')}</Text>
        <Text style={styles.versionText}>
          {t('settings_version', { version, build: buildNumber })}
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  sectionTitle: { color: palette.text, fontSize: 17, fontWeight: '800', marginTop: 14 },
  card: { gap: 12, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, padding: 14 },
  preferenceLabel: { color: palette.text, fontSize: 15, fontWeight: '800' },
  segmentedRow: { flexDirection: 'row', gap: 8 },
  segmentButton: { flex: 1, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: palette.borderStrong, paddingVertical: 10 },
  segmentButtonActive: { borderColor: palette.accent, backgroundColor: palette.accent },
  segmentText: { color: palette.text, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: palette.onAccent },
  cardList: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  settingsRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  settingsRowText: { flex: 1 },
  settingsRowLabel: { color: palette.text, fontSize: 15, fontWeight: '700' },
  settingsRowValue: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
  dangerRow: { borderBottomWidth: 0, backgroundColor: palette.dangerSoft },
  dangerText: { flex: 1, color: palette.danger, fontSize: 15, fontWeight: '800' },
  aboutCard: { alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 20, paddingVertical: 18 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  brandSymbol: { width: 36, height: 36 },
  aboutTitle: { color: palette.text, fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  aboutBody: { color: palette.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  versionText: { color: palette.textSubtle, fontSize: 12 },
});
