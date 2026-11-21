import { challengeUnlockWins } from '../content/rotation';
import { config } from '../content/catalog';
import type { FreeTrack } from '../content/rotation';
import type { Operator } from '../core/types';

export const operatorGlyph: Record<Operator, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export type Language = 'ru' | 'en';

export function localize(language: Language, russian: string, english: string): string {
  return language === 'en' ? english : russian;
}

export function trackName(language: Language, track: FreeTrack): string {
  return track === 'relax' ? localize(language, 'Спокойная игра', 'Relax') : localize(language, 'Испытание', 'Challenge');
}

export function dailyName(language: Language): string {
  return localize(language, 'Задача дня', 'Daily challenge');
}

// Historical completions stored only "endless" at the shared Challenge/Endless milestone.
export function unlockAnnouncement(language: Language, modes: readonly string[] = []): string {
  const names: string[] = [];
  if (modes.includes('free')) names.push(trackName(language, 'relax'));
  if (modes.includes('daily')) names.push(dailyName(language));
  const sharedLegacyUnlock = modes.includes('endless') && challengeUnlockWins === config.unlockProposal.endlessAfterNewWins;
  if (modes.includes('challenge') || sharedLegacyUnlock) names.push(trackName(language, 'challenge'));
  if (modes.includes('endless')) names.push('Endless');
  if (!names.length) return '';
  const joined = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + localize(language, ' и ', ' and ') + names.at(-1);
  const label = names.length === 1 ? localize(language, 'Новый режим', 'New mode')
    : localize(language, 'Новые режимы', 'New modes');
  return `${label} · ${joined}`;
}

export function conflictText(language: Language, horizontal: boolean, equation: string): string {
  const label = horizontal ? localize(language, 'По горизонтали', 'Across') : localize(language, 'По вертикали', 'Down');
  return `${label}: ${equation.replace(' = ', ' ≠ ')}`;
}

const nouns = {
  coin: { ru: ['монета', 'монеты', 'монет'], en: ['coin', 'coins'] },
  credit: { ru: ['кредит', 'кредита', 'кредитов'], en: ['credit', 'credits'] },
  point: { ru: ['очко', 'очка', 'очков'], en: ['point', 'points'] },
};
const russianPlural = new Intl.PluralRules('ru');

export function quantity(language: Language, value: number, noun: keyof typeof nouns): string {
  const category = russianPlural.select(value);
  const index = language === 'en' ? Number(value !== 1) : category === 'one' ? 0 : category === 'few' ? 1 : 2;
  return value + ' ' + nouns[noun][language][index];
}

// Static leaf labels retain their authored Russian copy when the session switches back.
const originals = new WeakMap<Element, { text: string; label: string | null }>();

export function localizeDocument(language: Language): void {
  document.documentElement.lang = language;
  for (const node of document.querySelectorAll<HTMLElement>('[data-en],[data-en-label]')) {
    const original = originals.get(node) ?? {text: node.textContent ?? '', label: node.getAttribute('aria-label')};
    originals.set(node, original);
    if (node.dataset.en !== undefined) node.textContent = language === 'en' ? node.dataset.en : original.text;
    if (node.dataset.enLabel !== undefined && original.label !== null) {
      node.setAttribute('aria-label', language === 'en' ? node.dataset.enLabel : original.label);
    }
  }
}
