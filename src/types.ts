export type Bindings = {
  HYPERDRIVE: Hyperdrive;
  POLAR_ACCESS_TOKEN: string;
  POLAR_PRODUCT_ID: string;
  POLAR_SERVER: string;
  ADMIN_TOKEN: string;
  MIN_BID_CENTS: string;
  SITE_URL: string;
};

export type Theme = 'light' | 'dark';

export interface Listing {
  id: string;
  name: string;
  url: string;
  tagline: string | null;
  category: string;
  avatar_url: string | null;
  total_cents: number;
  clicks: number;
  created_at: number;
  updated_at: number;
}

export interface Bid {
  id: string;
  listing_id: string;
  amount_cents: number;
  status: 'pending' | 'paid' | 'failed';
  payment_session_id: string | null;
  created_at: number;
  paid_at: number | null;
}

export interface TickerRow {
  id: string;
  name: string;
  amount_cents: number;
  paid_at: number;
}

// 分类的显示名称在各语言的字典里（src/i18n/locales/*.ts 的 categories 字段），这里只保留 key 的顺序
export const CATEGORY_KEYS = [
  'seo-ai-visibility',
  'ai-agents-infra',
  'ai-media',
  'marketing-ads',
  'dev-tools',
  'productivity',
  'people-profiles',
  'design-creative',
  'social-creator',
  'writing-content',
  'sales-leadgen',
  'business-finance-legal',
  'gaming-entertainment',
  'education',
  'health-fitness',
  'ecommerce-retail',
  'directories-discovery',
  'hiring-careers',
  'audio-podcasts',
  'crypto-web3',
  'agencies-services',
  'security-privacy',
  'travel-lifestyle',
  'media-news',
  'domains-assets',
  'leaderboards-attention',
  'real-estate',
] as const;
