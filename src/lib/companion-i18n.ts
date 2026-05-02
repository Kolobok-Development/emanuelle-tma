'use client';

import { useTranslations } from 'next-intl';

type CompanionForTranslation = {
  id: string;
  name: string;
  description: string;
  personality: string;
};

/**
 * Returns translated name, description, and personality for a companion.
 * Uses locale keys under "companions.<id>.*". Falls back to DB values when
 * no translation exists (e.g. new companions with UUID ids).
 */
export function useCompanionTranslation(companion: CompanionForTranslation | undefined) {
  const t = useTranslations('companions');

  if (!companion) {
    return { name: '', description: '', personality: '' };
  }

  const nameKey = `${companion.id}.name`;
  const descKey = `${companion.id}.description`;
  const persKey = `${companion.id}.personality`;

  const translatedName = t(nameKey);
  const translatedDesc = t(descKey);
  const translatedPers = t(persKey);

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/45d7ac2b-2eca-4e94-9301-e674e0d8db0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'companion-i18n.ts:useCompanionTranslation',message:'translation lookup',data:{companionId:companion.id,companionIdType:typeof companion.id,nameKey,translatedName,translatedNameEqualsNameKey:translatedName===nameKey,translatedNameStartsWithCompanions:typeof translatedName==='string'&&translatedName.startsWith('companions.')},timestamp:Date.now(),hypothesisId:'A-B-D'})}).catch(()=>{});
  // #endregion

  // next-intl returns the full key path when missing (e.g. "companions.1.name"), so treat key-like values as missing
  const isKeyLike = (v: string, key: string) =>
    !v || v === key || (typeof v === 'string' && v.startsWith('companions.'));
  const name = !isKeyLike(translatedName, nameKey) ? translatedName : companion.name;
  const description = !isKeyLike(translatedDesc, descKey) ? translatedDesc : companion.description;
  const personality = !isKeyLike(translatedPers, persKey) ? translatedPers : companion.personality;

  return { name, description, personality };
}
