import type { Dictionary, Locale } from './types';
import { en } from './locales/en';
import { zhCN } from './locales/zh-CN';
import { zhTW } from './locales/zh-TW';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { fr } from './locales/fr';
import { es } from './locales/es';

export type { Dictionary, Locale };

export const DEFAULT_LOCALE: Locale = 'en';

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
  ko,
  fr,
  es,
};

// 除默认语言（英文，无前缀）外，其余语言在 URL 里都带前缀，比如 /ja/rules
export const NON_DEFAULT_LOCALES: Locale[] = ['zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'es'];
export const ALL_LOCALES: Locale[] = [DEFAULT_LOCALE, ...NON_DEFAULT_LOCALES];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  es: 'Español',
};

// 语言切换按钮上显示的简短代码，例如 "EN" "CN"
export const LOCALE_SHORT: Record<Locale, string> = {
  en: 'EN',
  'zh-CN': 'CN',
  'zh-TW': 'TW',
  ja: 'JP',
  ko: 'KR',
  fr: 'FR',
  es: 'ES',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (ALL_LOCALES as string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

// 给定语言和不带前缀的子路径（例如 '' 或 '/rules'），拼出该语言对应的完整路径
export function localizedPath(locale: Locale, subpath: string): string {
  if (locale === DEFAULT_LOCALE) return subpath || '/';
  return `/${locale}${subpath}`;
}

// 简单的 {name} 占位符替换，不追求完整的 ICU 复数规则
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}
