import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';

import { useAppLanguage } from '@/src/i18n';
import { usePalette } from '@/src/design-system';

export default function TabsLayout() {
  const { t } = useAppLanguage();
  const palette = usePalette();

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      backgroundColor={palette.surface}
      iconColor={{ default: palette.textSubtle, selected: palette.accent }}
      labelStyle={{
        default: { color: palette.textSubtle },
        selected: { color: palette.accent },
      }}
      tintColor={palette.accent}
    >
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: 'map', selected: 'map.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="map" />}
        />
        <Label>{t('tabs_map')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="lines">
        <Icon
          sf={{ default: 'tram', selected: 'tram.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="train" />}
        />
        <Label>{t('tabs_lines')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="alerts">
        <Icon
          sf={{ default: 'exclamationmark.triangle', selected: 'exclamationmark.triangle.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="notification-important" />}
        />
        <Label>{t('tabs_alerts')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="you">
        <Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="person" />}
        />
        <Label>{t('tabs_saved')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
