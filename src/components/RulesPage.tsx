import type { Dictionary } from '../i18n';

export const RulesPage = (props: { t: Dictionary }) => {
  const { t } = props;
  return (
    <div class="max-w-[640px] mx-auto pt-12 pb-20 px-6">
      <h1 class="text-2xl">{t.rules.title}</h1>
      <p class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.rules.intro}</p>

      <h2 class="text-base mt-7 text-[var(--gold)]">{t.rules.h2Ranking}</h2>
      <p class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.rules.pRanking}</p>

      <h2 class="text-base mt-7 text-[var(--gold)]">{t.rules.h2HowToList}</h2>
      <p class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.rules.pHowToList}</p>

      <h2 class="text-base mt-7 text-[var(--gold)]">{t.rules.h2HowToOutbid}</h2>
      <p class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.rules.pHowToOutbid}</p>

      <h2 class="text-base mt-7 text-[var(--gold)]">{t.rules.h2NotAllowed}</h2>
      <ul>
        <li class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.rules.liPorn}</li>
        <li class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.rules.liInviteLinks}</li>
        <li class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.rules.liImpersonation}</li>
      </ul>
      <p class="text-[var(--text-dim)] text-[14.5px] leading-[1.75]">{t.rules.pRemoval}</p>
    </div>
  );
};
