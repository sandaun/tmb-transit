import type { AppLanguage } from '@/src/features/preferences/models';

const LEGAL_SITE_BASE_URL = 'https://sandaun.github.io/tmb-transit';

export const PROVIDER_LINKS = {
  tmb: 'https://developer.tmb.cat/',
  fgc: 'https://dadesobertes.fgc.cat/',
  fgcLicense: 'https://creativecommons.org/licenses/by/4.0/',
  tram: 'https://www.tram.cat/',
  tramConditions: 'https://opendata.tram.cat/assets/pdf/condicions_en.pdf',
} as const;

export function getLegalSiteUrl(
  language: AppLanguage,
  page: 'privacy' | 'sources' | 'support',
): string {
  return `${LEGAL_SITE_BASE_URL}/${language}/${page}/`;
}
