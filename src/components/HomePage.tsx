import type { Listing } from '../types';
import { CATEGORY_KEYS } from '../types';
import type { Dictionary, Locale } from '../i18n';
import { format } from '../i18n';
import { formatUsd, relativeTime, domainOf } from '../utils';

const MIN_BID_CENTS = 500; // 出价下限，5 美元，和服务端 MIN_BID_CENTS 保持一致
const BID_STEP_CENTS = 500; // 步进器每次 +/- 的幅度
const TOP_OVERTAKE_MARGIN_CENTS = 500; // 要追平/超过第一名，得比第一名多出这么多，和服务端 db.minRequiredTotalCents 保持一致
const OVERTAKE_MARGIN_CENTS = 100; // 要超过第一名以外的任意一位，只要比那一位多出这么多，同上保持一致

const CATEGORY_ICONS: Record<string, string> = {
  'seo-ai-visibility': '🔍',
  'ai-agents-infra': '🤖',
  'ai-media': '🎬',
  'marketing-ads': '📣',
  'dev-tools': '💻',
  productivity: '🗂️',
  'people-profiles': '🙋',
  'design-creative': '🎨',
  'social-creator': '📱',
  'writing-content': '✍️',
  'sales-leadgen': '📈',
  'business-finance-legal': '💼',
  'gaming-entertainment': '🎮',
  education: '🎓',
  'health-fitness': '🧘',
  'ecommerce-retail': '🛒',
  'directories-discovery': '🧭',
  'hiring-careers': '🧑‍💼',
  'audio-podcasts': '🎙️',
  'crypto-web3': '🪙',
  'agencies-services': '🏢',
  'security-privacy': '🔒',
  'travel-lifestyle': '✈️',
  'media-news': '📰',
  'domains-assets': '🌐',
  'leaderboards-attention': '🏆',
  'real-estate': '🏠',
};
const DEFAULT_CATEGORY_ICON = '📦';

// 每行的完整 class 字符串一次性算好，避免前三名和普通行的工具类互相覆盖（同一属性不能拆成两条类叠加）
const ROW_SHARED = 'grid items-center transition-colors duration-[120ms] hover:border-[var(--text-faint)] cursor-pointer';
const ROW_PLAIN = `row relative ${ROW_SHARED} grid-cols-[34px_64px_1fr] gap-[18px] py-5 px-1 border-0 border-b border-[var(--border)] rounded-none bg-transparent max-[560px]:grid-cols-[24px_48px_1fr] max-[560px]:gap-3 max-[560px]:py-4 max-[560px]:px-1`;
const ROW_TOP: Record<'top1' | 'top2' | 'top3', string> = {
  top1: `row relative ${ROW_SHARED} grid-cols-[auto_64px_1fr] gap-[18px] py-[22px] px-[26px] border rounded-[22px] border-[rgba(234,88,12,0.4)] bg-[linear-gradient(180deg,var(--rank1-soft),var(--surface)_160%)] max-[560px]:grid-cols-[auto_48px_1fr] max-[560px]:py-4 max-[560px]:px-[18px]`,
  top2: `row relative ${ROW_SHARED} grid-cols-[auto_64px_1fr] gap-[18px] py-[22px] px-[26px] border rounded-[22px] border-[rgba(249,115,22,0.35)] bg-[linear-gradient(180deg,var(--rank2-soft),var(--surface)_160%)] max-[560px]:grid-cols-[auto_48px_1fr] max-[560px]:py-4 max-[560px]:px-[18px]`,
  top3: `row relative ${ROW_SHARED} grid-cols-[auto_64px_1fr] gap-[18px] py-[22px] px-[26px] border rounded-[22px] border-[rgba(251,146,60,0.3)] bg-[linear-gradient(180deg,var(--rank3-soft),var(--surface)_160%)] max-[560px]:grid-cols-[auto_48px_1fr] max-[560px]:py-4 max-[560px]:px-[18px]`,
};
const rowClass = (i: number, isTierEnd: boolean): string => {
  const base = i === 0 ? ROW_TOP.top1 : i === 1 ? ROW_TOP.top2 : i === 2 ? ROW_TOP.top3 : ROW_PLAIN;
  // 紧挨着 Top3/Top10/Top20 这类分割线的最后一行不需要自己的底边框，分割线本身就是分隔了
  return isTierEnd ? `${base} border-b-0` : base;
};

const RANK_PLAIN = 'row-rank font-mono tabular-nums font-semibold text-lg text-[var(--text-dim)] whitespace-nowrap max-[560px]:text-[12px]';
const RANK_TOP: Record<'top1' | 'top2' | 'top3', string> = {
  top1: 'row-rank font-mono tabular-nums h-10 px-4 rounded-full flex items-center justify-center font-bold text-lg text-white bg-[var(--rank1)] whitespace-nowrap max-[560px]:h-8 max-[560px]:px-3 max-[560px]:text-sm',
  top2: 'row-rank font-mono tabular-nums h-10 px-4 rounded-full flex items-center justify-center font-bold text-lg text-white bg-[var(--rank2)] whitespace-nowrap max-[560px]:h-8 max-[560px]:px-3 max-[560px]:text-sm',
  top3: 'row-rank font-mono tabular-nums h-10 px-4 rounded-full flex items-center justify-center font-bold text-lg text-white bg-[var(--rank3)] whitespace-nowrap max-[560px]:h-8 max-[560px]:px-3 max-[560px]:text-sm',
};
const rankBadgeClass = (i: number): string => (i === 0 ? RANK_TOP.top1 : i === 1 ? RANK_TOP.top2 : i === 2 ? RANK_TOP.top3 : RANK_PLAIN);

const Avatar = (props: { src: string | null; name: string; size: 'sm' | 'lg' }) => {
  const sizeClass =
    props.size === 'lg'
      ? 'w-16 h-16 rounded-[18px] max-[560px]:w-12 max-[560px]:h-12 max-[560px]:rounded-[14px]'
      : 'w-[34px] h-[34px] rounded-lg';
  const base = `object-cover shrink-0 ${sizeClass}`;
  if (props.src) {
    return <img class={base} src={props.src} alt="" />;
  }
  return (
    <div class={`${base} flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-dim)] font-bold text-[15px]`}>
      {props.name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
};

const StatsBar = (props: { t: Dictionary; online: number; totalVisits: number }) => {
  const { t } = props;
  return (
    <div class="text-center mt-[22px] px-6">
      <div class="inline-flex items-center gap-0 bg-[var(--surface-2)] rounded-full px-4 py-2 text-[12.5px] text-[var(--text-faint)]">
        <span class="w-[7px] h-[7px] rounded-full bg-green-500 mr-2 shrink-0"></span>
        <span class="text-green-500 font-semibold">{format(t.home.statsBarOnline, { n: props.online })}</span>
        <span class="mx-[6px]">·</span>
        {format(t.home.statsBarVisits, { n: props.totalVisits.toLocaleString(t.numberLocale) })}
        <span class="mx-[6px]">·</span>
        <a
          class="text-[var(--text-dim)] hover:text-[var(--text)]"
          href="https://datafa.st/share/6a8bbb79c5b1e841b72c2655?period=last24h&granularity=hourly&via=jonathan-wilke"
          target="_blank"
          rel="noopener"
        >
          {t.home.viewData}
        </a>
      </div>
    </div>
  );
};

// {rank} 在不同语言里可能出现在句子中间，先按占位符拆开，rank 数字单独包一个 span 方便 JS 实时更新
const Headline = (props: { t: Dictionary; leaderboard: Listing[] }) => {
  const { t } = props;
  const top = props.leaderboard[0] ?? null;
  const defaultCents = top ? top.total_cents + TOP_OVERTAKE_MARGIN_CENTS : MIN_BID_CENTS;
  const [preRank, postRank] = t.home.claimHeadline.split('{rank}');
  return (
    <section class="max-w-[760px] mx-auto pt-[18px] pb-1 px-6 text-center">
      <h1 class="flex items-center justify-center flex-wrap gap-x-3 gap-y-2 m-0 mb-3 text-[40px] font-black tracking-[-0.02em] leading-[1.25] max-[640px]:text-[28px]">
        <span>
          {preRank}
          <span id="claim-rank">1</span>
          {postRank}
        </span>
        <span class="inline-flex items-center gap-2">
          <button
            type="button"
            id="bid-decr"
            aria-label="-"
            class="w-8 h-8 shrink-0 rounded-full bg-[var(--red-soft)] text-[var(--red)] text-lg font-bold flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            −
          </button>
          <span id="claim-amount" class="text-[var(--red)] font-black tabular-nums whitespace-nowrap">
            ${formatUsd(defaultCents, t.numberLocale)}
          </span>
          <button
            type="button"
            id="bid-incr"
            aria-label="+"
            class="w-8 h-8 shrink-0 rounded-full bg-[var(--red-soft)] text-[var(--red)] text-lg font-bold flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </span>
      </h1>
      <div class="max-w-[460px] m-auto">
        <p class="text-[14.5px] m-0">
          <span class="text-[var(--red)]">{t.home.claimSubStrong}</span>{' '}
          <span class="text-[var(--text-dim)]">{t.home.claimSubRest}</span>
        </p>
      </div>
    </section>
  );
};

const ListingForm = (props: { t: Dictionary; locale: Locale; leaderboard: Listing[] }) => {
  const { t, locale } = props;
  const defaultCents = props.leaderboard[0] ? props.leaderboard[0].total_cents + TOP_OVERTAKE_MARGIN_CENTS : MIN_BID_CENTS;
  return (
    <>
      <form id="listing-form" class="max-w-[920px] mx-auto mt-7 px-6 flex gap-[10px] items-stretch max-[640px]:flex-wrap">
        <input type="hidden" name="lang" value={locale} />
        <input type="hidden" id="f-bid-cents" name="bid_amount_cents" value={defaultCents} />
        <div class="flex-1 flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full px-[18px] min-w-0 max-[640px]:flex-[1_1_100%]">
          <span class="text-[var(--text-faint)] text-sm">🌐</span>
          <input
            id="f-input"
            name="input"
            class="flex-1 min-w-0 bg-transparent border-0 outline-none text-[var(--text)] text-[14.5px] py-[13px]"
            placeholder={t.home.inputPlaceholder}
            required
          />
        </div>
        <div class="relative shrink-0 max-[640px]:flex-1" id="cat-select">
          <button
            type="button"
            class="cat-select-btn is-placeholder h-full min-w-[180px] max-w-[260px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] cursor-pointer rounded-full pl-4 pr-7 text-sm text-left overflow-hidden max-[640px]:min-w-0 max-[640px]:max-w-none max-[640px]:w-full"
            id="cat-select-btn"
          >
            <span class="block overflow-hidden text-ellipsis whitespace-nowrap" id="cat-select-label">
              {t.home.catPlaceholder}
            </span>
          </button>
          <div
            class="cat-select-menu absolute top-[calc(100%+6px)] left-0 z-20 min-w-full max-w-[320px] max-h-[320px] overflow-y-auto bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-[6px] shadow-[0_12px_30px_-10px_var(--menu-shadow)]"
            id="cat-select-menu"
          >
            {CATEGORY_KEYS.map((key) => (
              <button
                type="button"
                class="cat-select-option block w-full text-left bg-transparent border-0 px-[10px] py-2 rounded-md text-[13.5px] text-[var(--text-dim)] cursor-pointer whitespace-nowrap hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                data-value={key}
              >
                {t.categories[key]}
              </button>
            ))}
          </div>
        </div>
        <input type="hidden" id="f-category" name="category" value="" />
        <button
          type="submit"
          class="bg-[var(--red)] text-white border-0 rounded-full px-[28px] text-sm font-bold cursor-pointer whitespace-nowrap transition-[transform,background] duration-[120ms] hover:bg-[#c72b30] hover:-translate-y-px disabled:opacity-70 disabled:cursor-default disabled:translate-y-0 max-[640px]:flex-1"
          id="f-submit"
        >
          {t.home.formSubmitBtn}
        </button>
      </form>
      <p class="max-w-[760px] mx-auto mt-[10px] px-6 text-center text-[12.5px] text-[var(--text-faint)]">{t.home.formHint}</p>
      <p
        class="form-error text-[var(--red)] text-[12.5px] mx-auto mt-2 px-6 max-w-[760px] text-center"
        id="form-error"
      ></p>
    </>
  );
};

const CatTabs = (props: { t: Dictionary }) => {
  const { t } = props;
  const catTabClass =
    'cat-tab shrink-0 bg-transparent border border-[var(--border)] text-[var(--text-dim)] rounded-full py-[7px] px-[14px] text-[13px] cursor-pointer whitespace-nowrap transition-[border-color,color,background] duration-[120ms] hover:text-[var(--text)]';
  const navBtnClass =
    'shrink-0 w-7 h-7 flex items-center justify-center bg-transparent border border-[var(--border)] text-[var(--text-dim)] rounded-full text-[15px] leading-none cursor-pointer transition-[border-color,color] duration-[120ms] enabled:hover:border-[var(--text-faint)] enabled:hover:text-[var(--text)] disabled:opacity-35 disabled:cursor-default';
  return (
    <div class="max-w-[920px] mx-auto mt-7 px-6 flex gap-2 items-center">
      <button type="button" class={`${catTabClass} active`} data-cat="all">
        {t.home.catAll}
      </button>
      <button type="button" class={navBtnClass} id="cat-prev" aria-label={t.home.catPrevAria}>
        ‹
      </button>
      <div class="flex-1 min-w-0 overflow-hidden" id="cat-viewport">
        <div class="flex gap-2 flex-nowrap justify-center" id="cat-track">
          {CATEGORY_KEYS.map((key) => (
            <button type="button" class={catTabClass} data-cat={key}>
              {CATEGORY_ICONS[key] || DEFAULT_CATEGORY_ICON} {t.categories[key]}
            </button>
          ))}
        </div>
      </div>
      <button type="button" class={navBtnClass} id="cat-next" aria-label={t.home.catNextAria}>
        ›
      </button>
    </div>
  );
};

const Row = (props: { item: Listing; index: number; page: number; t: Dictionary; isTierEnd: boolean }) => {
  const { item, index, page, t, isTierEnd } = props;
  const categoryLabel = t.categories[item.category] || t.home.uncategorized;
  return (
    <div class={rowClass(index, isTierEnd)} data-category={item.category} data-page={page} data-listing-id={item.id}>
      <div class={rankBadgeClass(index)}>#{index + 1}</div>
      <Avatar src={item.avatar_url} name={item.name} size="lg" />
      <div class="min-w-0">
        <div class="flex items-start justify-between gap-3">
          <a
            class="font-bold text-md block"
            href={`/go/${item.id}`}
            target="_blank"
            rel="noopener nofollow sponsored"
          >
            {item.name}
          </a>
          <div class="shrink-0 font-mono tabular-nums font-bold text-[var(--red)] text-[15px] whitespace-nowrap max-[560px]:text-lg">
            ${formatUsd(item.total_cents, t.numberLocale)}
          </div>
        </div>
        <div class="text-[var(--text-dim)] text-[12px] mt-1 leading-[1.5] line-clamp-2">
          {item.tagline || domainOf(item.url)}
        </div>
        <div class="text-[var(--text-faint)] text-[13.5px] mt-2 flex gap-2 items-center">
          <span>{relativeTime(item.updated_at, t)}</span>
          <span>
            {CATEGORY_ICONS[item.category] || DEFAULT_CATEGORY_ICON} {categoryLabel}
          </span>
          <span class="w-[5px] h-[5px] rounded-full bg-[var(--red)] shrink-0"></span>
          <span>{format(t.home.clicksLabel, { n: item.clicks })}</span>
        </div>
      </div>
      <button
        type="button"
        class="claim-btn absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-[var(--red)] text-white font-semibold text-[11.5px] px-3 py-1 rounded-full whitespace-nowrap shadow-md cursor-pointer disabled:opacity-70 disabled:cursor-default"
        data-listing-id={item.id}
        data-bid-cents={item.total_cents + (index === 0 ? TOP_OVERTAKE_MARGIN_CENTS : OVERTAKE_MARGIN_CENTS)}
      >
        {format(t.home.claimRank, {
          price: `$${formatUsd(item.total_cents + (index === 0 ? TOP_OVERTAKE_MARGIN_CENTS : OVERTAKE_MARGIN_CENTS), t.numberLocale)}`,
        })}
      </button>
    </div>
  );
};

const PAGE_SIZE = 30;

const RankDivider = (props: { label: string; page: number }) => (
  <div class="rank-divider flex items-center gap-3 my-1.5" data-page={props.page}>
    <span class="flex-1 h-px bg-[var(--border)]"></span>
    <span class="shrink-0 text-xs font-bold text-[var(--red)] bg-[var(--red-soft)] border border-[var(--red-soft)] py-[5px] px-[14px] rounded-full">
      {props.label}
    </span>
    <span class="flex-1 h-px bg-[var(--border)]"></span>
  </div>
);

export const HomePage = (props: {
  leaderboard: Listing[];
  online: number;
  totalVisits: number;
  t: Dictionary;
  locale: Locale;
}) => {
  const { t, locale } = props;
  const RANK_TIER_LABELS: Record<number, string> = { 3: t.home.tierTop3, 10: t.home.tierTop10, 20: t.home.tierTop20 };

  const boardItems: unknown[] = [];
  props.leaderboard.forEach((item, i) => {
    const rank = i + 1;
    const page = Math.ceil(rank / PAGE_SIZE);
    const tierLabel = RANK_TIER_LABELS[rank];
    const isTierEnd = Boolean(tierLabel) && props.leaderboard.length > rank;
    boardItems.push(<Row item={item} index={i} page={page} t={t} isTierEnd={isTierEnd} />);
    if (isTierEnd) {
      boardItems.push(<RankDivider label={tierLabel} page={page} />);
    }
  });
  const totalPages = Math.max(1, Math.ceil(props.leaderboard.length / PAGE_SIZE));

  const navBtnClass =
    'shrink-0 w-7 h-7 flex items-center justify-center bg-transparent border border-[var(--border)] text-[var(--text-dim)] rounded-full text-[15px] leading-none cursor-pointer transition-[border-color,color] duration-[120ms] enabled:hover:border-[var(--text-faint)] enabled:hover:text-[var(--text)] disabled:opacity-35 disabled:cursor-default';

  return (
    <>
      <StatsBar t={t} online={props.online} totalVisits={props.totalVisits} />
      <Headline t={t} leaderboard={props.leaderboard} />
      <ListingForm t={t} locale={locale} leaderboard={props.leaderboard} />
      <CatTabs t={t} />

      <section class="max-w-[920px] mx-auto mt-5 mb-[30px] px-6 flex flex-col gap-[15px]" id="board">
        {props.leaderboard.length === 0 ? (
          <div class="text-[var(--text-dim)] text-center py-10 text-sm">{t.home.emptyState}</div>
        ) : (
          boardItems
        )}
      </section>

      {totalPages > 1 && (
        <div class="max-w-[920px] mx-auto mt-5 mb-15 px-6 flex items-center justify-center gap-4" id="pagination-bar">
          <button type="button" class={navBtnClass} id="page-prev" aria-label={t.home.pagePrevAria}>
            ‹
          </button>
          <span class="text-[13px] text-[var(--text-dim)] font-mono" id="page-info">
            {format(t.home.pageInfo, { current: 1, total: totalPages })}
          </span>
          <button type="button" class={navBtnClass} id="page-next" aria-label={t.home.pageNextAria}>
            ›
          </button>
        </div>
      )}

      <div
        class="toast bg-[var(--surface)] border border-[var(--red)] text-[var(--text)] px-[18px] py-3 rounded-lg text-[13.5px] max-w-[90vw]"
        id="toast"
      ></div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
      (function () {
        var ERRORS = ${JSON.stringify(t.errors)};
        var REDIRECTING_TEXT = ${JSON.stringify(t.home.redirecting)};
        var PAGE_INFO_TEMPLATE = ${JSON.stringify(t.home.pageInfo)};
        var NUMBER_LOCALE = ${JSON.stringify(t.numberLocale)};
        var TOTALS = ${JSON.stringify(props.leaderboard.map((l) => l.total_cents))};
        var MIN_BID_CENTS = ${MIN_BID_CENTS};
        var BID_STEP_CENTS = ${BID_STEP_CENTS};

        function translateError(code) {
          return (code && ERRORS[code]) || ERRORS.GENERIC;
        }
        function renderPageInfo(current, total) {
          return PAGE_INFO_TEMPLATE.replace('{current}', current).replace('{total}', total);
        }
        function fmtUsd(cents) {
          var dollars = cents / 100;
          return '$' + dollars.toLocaleString(NUMBER_LOCALE, { maximumFractionDigits: dollars % 1 === 0 ? 0 : 2 });
        }

        var form = document.getElementById('listing-form');
        var errorEl = document.getElementById('form-error');
        var submitBtn = document.getElementById('f-submit');
        var toast = document.getElementById('toast');
        var toastTimer;

        function showToast(msg) {
          toast.textContent = msg;
          toast.classList.add('show');
          clearTimeout(toastTimer);
          toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3000);
        }

        // 首页大标题上的 +/- 出价步进器：拖动金额时实时算出这个金额能排第几名，
        // 并把选好的金额同步进表单的隐藏字段，提交时一起发给后端
        var claimRankEl = document.getElementById('claim-rank');
        var claimAmountEl = document.getElementById('claim-amount');
        var bidDecrBtn = document.getElementById('bid-decr');
        var bidIncrBtn = document.getElementById('bid-incr');
        var bidCentsInput = document.getElementById('f-bid-cents');
        var bidCents = parseInt(bidCentsInput.value, 10) || MIN_BID_CENTS;

        function updateClaimUI() {
          var rank = 1;
          for (var i = 0; i < TOTALS.length; i++) {
            if (TOTALS[i] > bidCents) rank++;
          }
          if (claimRankEl) claimRankEl.textContent = String(rank);
          if (claimAmountEl) claimAmountEl.textContent = fmtUsd(bidCents);
          bidCentsInput.value = bidCents;
          if (bidDecrBtn) bidDecrBtn.disabled = bidCents <= MIN_BID_CENTS;
        }

        if (bidDecrBtn) {
          bidDecrBtn.addEventListener('click', function () {
            bidCents = Math.max(MIN_BID_CENTS, bidCents - BID_STEP_CENTS);
            updateClaimUI();
          });
        }
        if (bidIncrBtn) {
          bidIncrBtn.addEventListener('click', function () {
            bidCents = bidCents + BID_STEP_CENTS;
            updateClaimUI();
          });
        }
        updateClaimUI();

        document.querySelectorAll('.claim-btn').forEach(function (btn) {
          btn.addEventListener('click', async function (e) {
            e.stopPropagation();
            var id = btn.getAttribute('data-listing-id');
            var cents = btn.getAttribute('data-bid-cents');
            btn.disabled = true;
            var original = btn.textContent;
            btn.textContent = REDIRECTING_TEXT;
            try {
              var fd = new FormData();
              fd.set('listing_id', id);
              fd.set('bid_amount_cents', cents);
              fd.set('lang', ${JSON.stringify(locale)});
              var res = await fetch('/api/checkout', { method: 'POST', body: fd });
              var data = await res.json();
              if (!res.ok) throw new Error(translateError(data.error));
              window.location.href = data.url;
            } catch (err) {
              btn.disabled = false;
              btn.textContent = original;
              showToast(err.message);
            }
          });
        });

        // 卡片上除了名字链接和"抢第一"按钮之外的空白区域，点了也直接新开 tab 跳转目标网站
        document.querySelectorAll('.row').forEach(function (row) {
          row.addEventListener('click', function (e) {
            if (e.target.closest('a, button')) return;
            var id = row.getAttribute('data-listing-id');
            if (id) window.open('/go/' + id, '_blank', 'noopener');
          });
        });

        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          errorEl.classList.remove('show');
          var categoryInput = document.getElementById('f-category');
          if (categoryInput && !categoryInput.value) {
            errorEl.textContent = translateError('MISSING_CATEGORY');
            errorEl.classList.add('show');
            return;
          }
          submitBtn.disabled = true;
          var original = submitBtn.textContent;
          submitBtn.textContent = REDIRECTING_TEXT;
          try {
            var res = await fetch('/api/checkout', { method: 'POST', body: new FormData(form) });
            var data = await res.json();
            if (!res.ok) throw new Error(translateError(data.error));
            window.location.href = data.url;
          } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.add('show');
            submitBtn.disabled = false;
            submitBtn.textContent = original;
          }
        });

        // 自定义分类下拉：原生 <select> 的弹出列表由浏览器/系统绘制，样式和对齐都控制不了，
        // 换成自己实现的按钮 + 悬浮列表，弹出框始终和按钮左对齐，不会跟着箭头图标跑偏
        var catSelectBtn = document.getElementById('cat-select-btn');
        var catSelectMenu = document.getElementById('cat-select-menu');
        var catSelectLabel = document.getElementById('cat-select-label');
        var catHiddenInput = document.getElementById('f-category');

        if (catSelectBtn) {
          catSelectBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            catSelectMenu.classList.toggle('show');
          });
          document.querySelectorAll('.cat-select-option').forEach(function (opt) {
            opt.addEventListener('click', function () {
              catHiddenInput.value = opt.getAttribute('data-value');
              catSelectLabel.textContent = opt.textContent;
              catSelectBtn.classList.remove('is-placeholder');
              catSelectMenu.classList.remove('show');
            });
          });
          document.addEventListener('click', function () {
            catSelectMenu.classList.remove('show');
          });
        }

        // 榜单分页 + 分类筛选：筛选特定分类时不分页，显示全部匹配项；选"全部"时按页码翻页
        var board = document.getElementById('board');
        var boardItems = board ? Array.prototype.slice.call(board.querySelectorAll('.row, .rank-divider')) : [];
        var paginationBar = document.getElementById('pagination-bar');
        var pagePrev = document.getElementById('page-prev');
        var pageNext = document.getElementById('page-next');
        var pageInfo = document.getElementById('page-info');
        var totalPages = boardItems.reduce(function (max, el) {
          return Math.max(max, parseInt(el.getAttribute('data-page'), 10) || 1);
        }, 1);
        var currentCategory = 'all';
        var currentPage = 1;

        function applyBoardVisibility() {
          boardItems.forEach(function (el) {
            if (currentCategory === 'all') {
              var p = parseInt(el.getAttribute('data-page'), 10) || 1;
              el.style.display = p === currentPage ? '' : 'none';
            } else if (el.classList.contains('rank-divider')) {
              el.style.display = 'none';
            } else {
              el.style.display = el.getAttribute('data-category') === currentCategory ? '' : 'none';
            }
          });
          if (paginationBar) {
            paginationBar.style.display = currentCategory === 'all' && totalPages > 1 ? '' : 'none';
            if (pageInfo) pageInfo.textContent = renderPageInfo(currentPage, totalPages);
            if (pagePrev) pagePrev.disabled = currentPage <= 1;
            if (pageNext) pageNext.disabled = currentPage >= totalPages;
          }
        }

        if (pagePrev) {
          pagePrev.addEventListener('click', function () {
            if (currentPage > 1) {
              currentPage--;
              applyBoardVisibility();
              board.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        }
        if (pageNext) {
          pageNext.addEventListener('click', function () {
            if (currentPage < totalPages) {
              currentPage++;
              applyBoardVisibility();
              board.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        }

        document.querySelectorAll('.cat-tab').forEach(function (tab) {
          tab.addEventListener('click', function () {
            document.querySelectorAll('.cat-tab').forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            currentCategory = tab.getAttribute('data-cat');
            currentPage = 1;
            applyBoardVisibility();
          });
        });

        applyBoardVisibility();

        // 分类标签分页：按当前一屏能放下几个，一批一批翻页显示，而不是横向滚动
        var viewport = document.getElementById('cat-viewport');
        var track = document.getElementById('cat-track');
        var prevBtn = document.getElementById('cat-prev');
        var nextBtn = document.getElementById('cat-next');
        var tabs = Array.prototype.slice.call(track.children);
        var catPageSize = tabs.length;
        var catPage = 0;

        function computePageSize() {
          var vw = viewport.clientWidth;
          var gap = 8;
          var w = 0;
          var count = 0;
          for (var i = 0; i < tabs.length; i++) {
            var tw = tabs[i].offsetWidth;
            var next = w + (count > 0 ? gap : 0) + tw;
            if (next > vw && count > 0) break;
            w = next;
            count++;
          }
          return Math.max(1, count);
        }

        function renderCatPage() {
          var start = catPage * catPageSize;
          var end = start + catPageSize;
          tabs.forEach(function (tab, i) {
            tab.style.display = (i >= start && i < end) ? '' : 'none';
          });
          prevBtn.disabled = catPage === 0;
          nextBtn.disabled = end >= tabs.length;
        }

        function recalc() {
          tabs.forEach(function (t) { t.style.display = ''; });
          catPageSize = computePageSize();
          var maxCatPage = Math.max(0, Math.ceil(tabs.length / catPageSize) - 1);
          if (catPage > maxCatPage) catPage = maxCatPage;
          renderCatPage();
        }

        prevBtn.addEventListener('click', function () {
          if (catPage > 0) {
            catPage--;
            renderCatPage();
          }
        });
        nextBtn.addEventListener('click', function () {
          var maxCatPage = Math.max(0, Math.ceil(tabs.length / catPageSize) - 1);
          if (catPage < maxCatPage) {
            catPage++;
            renderCatPage();
          }
        });

        window.addEventListener('resize', recalc);
        recalc();

        // 在线心跳：页面打开期间定期上报，服务端按最近一次心跳时间判断是否还在线
        function pingPresence() {
          fetch('/api/presence/ping', { method: 'POST' }).catch(function () {});
        }
        setInterval(pingPresence, 25000);
      })();
    `,
        }}
      />
    </>
  );
};
