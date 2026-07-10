import { Text as NativeText, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme';

export function Text({ style, ...props }: TextProps) {
  return <NativeText style={[{ fontFamily: Fonts.sans }, style]} {...props} />;
}
