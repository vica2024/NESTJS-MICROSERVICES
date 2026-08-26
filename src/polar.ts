import { Polar } from '@polar-sh/sdk';
import type { Bindings } from './types';

// @polar-sh/sdk 本身就是 fetch-based 的，Cloudflare Workers 上不需要像 Stripe SDK 那样
// 额外换 httpClient。POLAR_SERVER 默认按沙箱环境跑，正式上线前记得在 wrangler.toml 里
// 把它改成 "production"，就像 Stripe 测试密钥换成 sk_live_ 一样。
export function getPolar(env: Bindings): Polar {
  return new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
  });
}
