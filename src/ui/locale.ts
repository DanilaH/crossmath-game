import type { Operator } from '../core/types';

export const operatorGlyph: Record<Operator, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export type Language = 'ru' | 'en';

export function localize(language: Language, russian: string, english: string): string {
  return language === 'en' ? english : russian;
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
