import { Platform } from 'react-native';

import { dark, light } from '@/constants/colors';

export const Colors = {
  light: {
    ...light,
    text: light.text,
    background: light.background,
    tint: light.accent,
    icon: light.textMuted,
    tabIconDefault: light.textSubtle,
    tabIconSelected: light.accent,
  },
  dark: {
    ...dark,
    text: dark.text,
    background: dark.background,
    tint: dark.accent,
    icon: dark.textMuted,
    tabIconDefault: dark.textSubtle,
    tabIconSelected: dark.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Instrument Sans',
    sansMedium: 'Instrument Sans',
    sansSemiBold: 'Instrument Sans',
    sansBold: 'Instrument Sans',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'InstrumentSans',
    sansMedium: 'InstrumentSans',
    sansSemiBold: 'InstrumentSans',
    sansBold: 'InstrumentSans',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'Instrument Sans', system-ui, sans-serif",
    sansMedium: "'Instrument Sans', system-ui, sans-serif",
    sansSemiBold: "'Instrument Sans', system-ui, sans-serif",
    sansBold: "'Instrument Sans', system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', system-ui, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
