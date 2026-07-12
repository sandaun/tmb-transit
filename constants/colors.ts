export type AppColorScheme = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceTranslucent: string;
  mapControlSurface: string;
  surfaceStrong: string;
  border: string;
  borderStrong: string;
  divider: string;
  shadow: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  accent: string;
  accentPressed: string;
  accentSoft: string;
  onAccent: string;
  realtime: string;
  favorite: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  statusOk: string;
  statusOkSoft: string;
}

export const light: Palette = {
  background: '#F7F3EC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceTranslucent: 'rgba(255, 255, 255, 0.86)',
  mapControlSurface: 'rgba(255, 255, 255, 0.86)',
  surfaceStrong: '#241C16',
  border: '#ECE4D8',
  borderStrong: '#DCCFBD',
  divider: '#F0E9DE',
  shadow: '#241C16',
  text: '#241C16',
  textMuted: '#7A6A5B',
  textSubtle: '#A0907E',
  textInverse: '#FFFFFF',
  accent: '#E4692A',
  accentPressed: '#C4531B',
  accentSoft: '#FBEADF',
  onAccent: '#FFFFFF',
  realtime: '#B8710E',
  favorite: '#E8A011',
  danger: '#D92D20',
  dangerSoft: '#FDECEA',
  warning: '#B7791F',
  warningSoft: '#FBF1DE',
  info: '#2E6BE0',
  infoSoft: '#EAF1FD',
  statusOk: '#1E9E5A',
  statusOkSoft: 'rgba(30, 158, 90, 0.14)',
};

export const dark: Palette = {
  background: '#17142A',
  surface: '#262138',
  surfaceElevated: '#2E2846',
  surfaceTranslucent: 'rgba(48, 40, 72, 0.60)',
  mapControlSurface: 'rgba(38, 33, 56, 0.90)',
  surfaceStrong: '#F6EFEA',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  divider: 'rgba(255, 255, 255, 0.08)',
  shadow: '#000000',
  text: '#F6EFEA',
  textMuted: '#B3A6C0',
  textSubtle: '#9A8CB0',
  textInverse: '#241C16',
  accent: '#FB8A3C',
  accentPressed: '#E4692A',
  accentSoft: 'rgba(251, 138, 60, 0.16)',
  onAccent: '#221200',
  realtime: '#FFC24D',
  favorite: '#FFC24D',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255, 107, 107, 0.14)',
  warning: '#F2B84B',
  warningSoft: 'rgba(242, 184, 75, 0.14)',
  info: '#6AA6FF',
  infoSoft: 'rgba(106, 166, 255, 0.14)',
  statusOk: '#47D18A',
  statusOkSoft: 'rgba(71, 209, 138, 0.14)',
};

export const palettes: Record<AppColorScheme, Palette> = { light, dark };

export function getPalette(scheme: AppColorScheme): Palette {
  return palettes[scheme];
}
