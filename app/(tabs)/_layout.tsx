import { DynamicColorIOS, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';

import { useAppLanguage } from '@/src/i18n';

function getLiquidGlassColor() {
  if (Platform.OS === 'ios') {
    return DynamicColorIOS({
      light: '#0B1220',
      dark: '#FFFFFF',
    });
  }

  return '#0B1220';
}

const liquidGlassColor = getLiquidGlassColor();

export default function TabsLayout() {
  const { t } = useAppLanguage();

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      labelStyle={{
        color: liquidGlassColor,
      }}
      tintColor={liquidGlassColor}
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
          sf={{ default: 'bookmark', selected: 'bookmark.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="bookmark" />}
        />
        <Label>{t('tabs_saved')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
