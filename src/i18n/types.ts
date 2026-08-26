export type Locale = 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'fr' | 'es';

export interface Dictionary {
  htmlLang: string;
  numberLocale: string;
  meta: {
    description: string;
  };
  nav: {
    rankboard: string;
    rules: string;
    about: string;
  };
  footer: {
    text: string;
    rulesLink: string;
  };
  pageTitles: {
    home: string;
    rules: string;
    about: string;
  };
  home: {
    statsBarOnline: string;
    statsBarVisits: string;
    viewData: string;
    claimHeadline: string;
    claimSubStrong: string;
    claimSubRest: string;
    inputPlaceholder: string;
    catPlaceholder: string;
    formSubmitBtn: string;
    formHint: string;
    catAll: string;
    catPrevAria: string;
    catNextAria: string;
    claimRank: string;
    clicksLabel: string;
    uncategorized: string;
    tierTop3: string;
    tierTop10: string;
    tierTop20: string;
    pagePrevAria: string;
    pageNextAria: string;
    pageInfo: string;
    emptyState: string;
    redirecting: string;
  };
  errors: {
    MISSING_INPUT: string;
    MISSING_CATEGORY: string;
    INVALID_INPUT: string;
    NOT_FOUND: string;
    INVALID_URL_FORMAT: string;
    UNSUPPORTED_URL: string;
    URL_UNREACHABLE: string;
    CHECKOUT_FAILED: string;
    BID_TOO_LOW: string;
    GENERIC: string;
  };
  rules: {
    title: string;
    intro: string;
    h2Ranking: string;
    pRanking: string;
    h2HowToList: string;
    pHowToList: string;
    h2HowToOutbid: string;
    pHowToOutbid: string;
    h2NotAllowed: string;
    liPorn: string;
    liInviteLinks: string;
    liImpersonation: string;
    pRemoval: string;
  };
  about: {
    title: string;
    p1: string;
    p2: string;
    p3: string;
  };
  time: {
    justNow: string;
    secondsAgo: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
  listingNotFound: string;
  categories: Record<string, string>;
}
