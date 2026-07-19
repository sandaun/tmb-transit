import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getLegalSiteUrl, PROVIDER_LINKS } from '@/src/config/legal-links';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';
import { useAppLanguage } from '@/src/i18n';

interface SourceCardProps {
  attribution: string;
  description: string;
  linkLabel: string;
  onPress: () => void;
  title: string;
}

function SourceCard({ attribution, description, linkLabel, onPress, title }: SourceCardProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.sourceCard}>
      <Text style={styles.sourceTitle}>{title}</Text>
      <Text style={styles.sourceDescription}>{description}</Text>
      <Text style={styles.attribution}>{attribution}</Text>
      <Pressable accessibilityRole="link" style={styles.sourceLink} onPress={onPress}>
        <Text style={styles.sourceLinkText}>{linkLabel}</Text>
        <MaterialIcons name="open-in-new" size={17} color={palette.accent} />
      </Pressable>
    </View>
  );
}

export default function DataSourcesScreen() {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { language, t } = useAppLanguage();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <Text style={styles.intro}>{t('sources_intro')}</Text>

      <SourceCard
        title="TMB"
        attribution={t('sources_tmb_attribution')}
        description={t('sources_tmb_description')}
        linkLabel={t('sources_provider_website')}
        onPress={() => void Linking.openURL(PROVIDER_LINKS.tmb)}
      />

      <View style={styles.sourceCard}>
        <Text style={styles.sourceTitle}>FGC</Text>
        <Text style={styles.sourceDescription}>{t('sources_fgc_description')}</Text>
        <Text style={styles.attribution}>{t('sources_fgc_attribution')}</Text>
        <View style={styles.linkRow}>
          <Pressable
            accessibilityRole="link"
            style={styles.sourceLink}
            onPress={() => void Linking.openURL(PROVIDER_LINKS.fgc)}
          >
            <Text style={styles.sourceLinkText}>{t('sources_provider_website')}</Text>
            <MaterialIcons name="open-in-new" size={17} color={palette.accent} />
          </Pressable>
          <Pressable
            accessibilityRole="link"
            style={styles.sourceLink}
            onPress={() => void Linking.openURL(PROVIDER_LINKS.fgcLicense)}
          >
            <Text style={styles.sourceLinkText}>CC BY 4.0</Text>
            <MaterialIcons name="open-in-new" size={17} color={palette.accent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.sourceCard}>
        <View style={styles.tramBrand}>
          <Text style={styles.poweredBy}>Powered by</Text>
          <Image
            accessibilityIgnoresInvertColors
            contentFit="contain"
            source={require('@/assets/transport/tram.png')}
            style={styles.tramLogo}
          />
        </View>
        <Text style={styles.sourceDescription}>{t('sources_tram_description')}</Text>
        <View style={styles.linkRow}>
          <Pressable
            accessibilityRole="link"
            style={styles.sourceLink}
            onPress={() => void Linking.openURL(PROVIDER_LINKS.tram)}
          >
            <Text style={styles.sourceLinkText}>{t('sources_provider_website')}</Text>
            <MaterialIcons name="open-in-new" size={17} color={palette.accent} />
          </Pressable>
          <Pressable
            accessibilityRole="link"
            style={styles.sourceLink}
            onPress={() => void Linking.openURL(PROVIDER_LINKS.tramConditions)}
          >
            <Text style={styles.sourceLinkText}>{t('sources_reuse_conditions')}</Text>
            <MaterialIcons name="open-in-new" size={17} color={palette.accent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.disclaimerCard}>
        <MaterialIcons name="info-outline" size={21} color={palette.accent} />
        <View style={styles.disclaimerText}>
          <Text style={styles.disclaimerTitle}>{t('sources_disclaimer_title')}</Text>
          <Text style={styles.sourceDescription}>{t('sources_disclaimer_body')}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="link"
        style={styles.publicSourcesLink}
        onPress={() => void Linking.openURL(getLegalSiteUrl(language, 'sources'))}
      >
        <Text style={styles.sourceLinkText}>{t('sources_full_information')}</Text>
        <MaterialIcons name="open-in-new" size={17} color={palette.accent} />
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  intro: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  sourceCard: { gap: 9, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, padding: 16 },
  sourceTitle: { color: palette.text, fontSize: 18, fontWeight: '800' },
  sourceDescription: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
  attribution: { color: palette.text, fontSize: 13, fontWeight: '700' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  sourceLink: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceLinkText: { color: palette.accent, fontSize: 13, fontWeight: '800' },
  tramBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  poweredBy: { color: palette.accent, fontSize: 16, fontWeight: '800' },
  tramLogo: { width: 92, height: 30 },
  disclaimerCard: { flexDirection: 'row', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, padding: 16 },
  disclaimerText: { flex: 1, gap: 5 },
  disclaimerTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  publicSourcesLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
});
