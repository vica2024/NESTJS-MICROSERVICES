import type { Dictionary } from '../i18n';

export const AboutPage = (props: { t: Dictionary }) => {
  const { t } = props;
  return (
    <div class="max-w-[640px] mx-auto pt-12 pb-20 px-6">
      <h1 class="text-2xl">{t.about.title}</h1>
      <p class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.about.p1}</p>
      <p class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.about.p2}</p>
      <p class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.about.p3}</p>
    </div>
  );
};
