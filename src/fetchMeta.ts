// 输入可以是网址，也可以是 Twitter/X 的 @handle 或主页链接
export type ParsedInput = { type: 'twitter'; handle: string } | { type: 'url'; url: string };

const HOSTS = new Set(['twitter.com', 'x.com']);

export function classifyInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const handleOnly = trimmed.match(/^@([A-Za-z0-9_]{1,15})$/);
  if (handleOnly) return { type: 'twitter', handle: handleOnly[1] };

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (HOSTS.has(host)) {
    const handle = url.pathname.split('/').filter(Boolean)[0];
    if (handle && /^[A-Za-z0-9_]{1,15}$/.test(handle)) {
      return { type: 'twitter', handle };
    }
  }
  return { type: 'url', url: url.toString() };
}

// 防止对内网/本机地址发起请求
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h.endsWith('.local')) return true;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let m = html.match(
      new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i')
    );
    if (!m) {
      m = html.match(
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${escaped}["']`, 'i')
      );
    }
    if (m) return decodeHtmlEntities(m[1]).trim();
  }
  return null;
}

export function faviconFallback(base: URL): string {
  return `https://www.google.com/s2/favicons?domain=${base.hostname}&sz=128`;
}

export interface ScrapedMeta {
  name: string;
  tagline: string;
  avatar_url: string;
}

export function extractMeta(html: string, base: URL): ScrapedMeta {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const ogTitle = pickMeta(html, ['og:title', 'twitter:title']);
  const ogDesc = pickMeta(html, ['og:description', 'twitter:description', 'description']);
  const ogImage = pickMeta(html, ['og:image', 'twitter:image']);
  const iconMatch =
    html.match(/<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut icon|icon|apple-touch-icon)["']/i);

  const name = (ogTitle || (titleMatch ? decodeHtmlEntities(titleMatch[1]) : '')).trim().slice(0, 60);
  const tagline = (ogDesc || '').trim().slice(0, 140);

  let avatar = ogImage || (iconMatch ? iconMatch[1] : null);
  if (avatar) {
    try {
      avatar = new URL(avatar, base).toString();
    } catch {
      avatar = null;
    }
  }
  if (!avatar) avatar = faviconFallback(base);

  return { name, tagline, avatar_url: avatar };
}

const MAX_BYTES = 200_000;
const FETCH_TIMEOUT_MS = 8000;

export async function fetchUrlMeta(target: URL): Promise<ScrapedMeta> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; OutbidBot/1.0; +https://outbid.example)' },
    });
    if (!res.ok) {
      throw new Error(`unreachable: HTTP ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return { name: '', tagline: '', avatar_url: faviconFallback(target) };
    }

    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        html += decoder.decode(value, { stream: true });
        if (bytes > MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
    }
    return extractMeta(html, target);
  } finally {
    clearTimeout(timer);
  }
}

// 没有付费的 X/Twitter API，用 unavatar.io 能否找到头像作为账号是否存在的替代判断：
// fallback=false 时，找不到头像会返回 404，而不是给一张默认占位图
export async function twitterHandleExists(handle: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://unavatar.io/twitter/${handle}?fallback=false`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
