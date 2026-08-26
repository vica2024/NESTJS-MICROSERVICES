import { ALL_LOCALES, LOCALE_LABELS, LOCALE_SHORT, localizedPath } from '../i18n';
import type { Dictionary, Locale } from '../i18n';
import type { Theme } from '../types';
import { version as APP_VERSION } from '../../package.json';

// 主题按钮显示的是"点了会切到哪个主题"，浅色下显示月亮（点了变深色），深色下显示太阳（点了变浅色）
const MOON_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const SUN_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

// 品牌 logo：浅色版给浅色背景用（柱子深、更容易看清），深色版给深色背景用（最短那根柱子更亮）
const LOGO_LIGHT =
  '<svg width="26" height="26" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg"><rect x="45" y="64" width="150" height="24" rx="12" fill="#f97316"/><rect x="67.5" y="108" width="105" height="24" rx="12" fill="#fdba74"/><rect x="87.5" y="152" width="65" height="24" rx="12" fill="#fed7aa"/></svg>';
const LOGO_DARK =
  '<svg width="26" height="26" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg"><rect x="45" y="64" width="150" height="24" rx="12" fill="#f97316"/><rect x="67.5" y="108" width="105" height="24" rx="12" fill="#fdba74"/><rect x="87.5" y="152" width="65" height="24" rx="12" fill="#ffedd5"/></svg>';

export const Layout = (props: {
  title: string;
  t: Dictionary;
  locale: Locale;
  path: string;
  theme: Theme;
  children: any;
}) => {
  const { t, locale, path, theme } = props;
  return (
    <html lang={t.htmlLang} data-theme={theme}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>
          {props.title} · PayRank.cc
        </title>
        <meta name="description" content={t.meta.description} />
        <link
          rel="icon"
          type="image/svg+xml"
          href={`data:image/svg+xml,${encodeURIComponent(theme === 'light' ? LOGO_LIGHT : LOGO_DARK)}`}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
        />
        <link rel="stylesheet" href="/styles.css" />
        <script
          defer
          data-website-id="dfid_kfu93VAZbgLUBqNQJeJEB"
          data-domain="payrank.cc"
          src="https://datafa.st/js/script.js"
        ></script>
      </head>
      <body>
        <header class="flex items-center justify-between px-6 py-[18px] border-b border-[var(--border)] max-w-[920px] mx-auto">
          <a href={localizedPath(locale, '')} class="font-black text-lg tracking-[0.02em] inline-flex items-center gap-2">
            <span id="brand-logo" dangerouslySetInnerHTML={{ __html: theme === 'light' ? LOGO_LIGHT : LOGO_DARK }}></span>
            PayRank<span class="text-[var(--red)]">·</span>
          </a>
          <nav class="flex items-center gap-5 text-sm text-[var(--text-dim)]">
            <a href={localizedPath(locale, '')} class="hover:text-[var(--text)]">
              {t.nav.rankboard}
            </a>
            <a href={localizedPath(locale, '/rules')} class="hover:text-[var(--text)]">
              {t.nav.rules}
            </a>
            <a href={localizedPath(locale, '/about')} class="hover:text-[var(--text)]">
              {t.nav.about}
            </a>
            <div class="relative">
              <button
                type="button"
                class="flex items-center bg-transparent border-0 p-0 text-[var(--text-dim)] cursor-pointer hover:text-[var(--text)]"
                id="lang-switch-btn"
                aria-label="Change language"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
              </button>
              <div
                class="lang-switch-menu absolute top-[calc(100%+8px)] right-0 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-[6px] min-w-[140px] shadow-[0_12px_30px_-10px_var(--menu-shadow)]"
                id="lang-switch-menu"
              >
                {ALL_LOCALES.map((l) => (
                  <a
                    href={localizedPath(l, path)}
                    class={`block px-[10px] py-[7px] rounded-md text-[13.5px] text-[var(--text-dim)] whitespace-nowrap hover:bg-[var(--surface-2)] hover:text-[var(--text)] ${l === locale ? 'active' : ''}`}
                  >
                    <span class="lang-switch-code inline-block w-[26px] font-mono text-[11px] font-bold text-[var(--text-faint)] tracking-[0.02em]">
                      {LOCALE_SHORT[l]}
                    </span>{' '}
                    {LOCALE_LABELS[l]}
                  </a>
                ))}
              </div>
            </div>
            <button
              type="button"
              class="flex items-center bg-transparent border-0 p-0 text-[var(--text-dim)] cursor-pointer hover:text-[var(--text)]"
              id="theme-toggle-btn"
              aria-label="Toggle theme"
              dangerouslySetInnerHTML={{ __html: theme === 'light' ? MOON_ICON : SUN_ICON }}
            ></button>
          </nav>
        </header>
        {props.children}
        <footer class="max-w-[920px] mx-auto p-6 text-[var(--text-faint)] text-[12.5px] text-center border-t border-[var(--border)]">
          <p>
            {t.footer.text} <a href={localizedPath(locale, '/rules')}>{t.footer.rulesLink}</a>
          </p>
          <p class="mt-2 text-[var(--text-faint)]">
            © {new Date().getFullYear()} PayRank.cc <span class="opacity-60">· v{APP_VERSION}</span>
          </p>
        </footer>
        <script
          dangerouslySetInnerHTML={{
            __html: `
        (function () {
          var btn = document.getElementById('lang-switch-btn');
          var menu = document.getElementById('lang-switch-menu');
          if (btn && menu) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              menu.classList.toggle('show');
            });
            document.addEventListener('click', function () {
              menu.classList.remove('show');
            });
          }

          var themeBtn = document.getElementById('theme-toggle-btn');
          var brandLogo = document.getElementById('brand-logo');
          if (themeBtn) {
            var MOON_ICON = ${JSON.stringify(MOON_ICON)};
            var SUN_ICON = ${JSON.stringify(SUN_ICON)};
            var LOGO_LIGHT = ${JSON.stringify(LOGO_LIGHT)};
            var LOGO_DARK = ${JSON.stringify(LOGO_DARK)};
            themeBtn.addEventListener('click', function () {
              var html = document.documentElement;
              var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
              html.setAttribute('data-theme', next);
              themeBtn.innerHTML = next === 'light' ? MOON_ICON : SUN_ICON;
              if (brandLogo) brandLogo.innerHTML = next === 'light' ? LOGO_LIGHT : LOGO_DARK;
              document.cookie = 'theme=' + next + '; path=/; max-age=31536000; samesite=lax';
            });
          }
        })();
      `,
          }}
        />
      </body>
    </html>
  );
};
