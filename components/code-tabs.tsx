import { highlight, type Language } from '@/lib/highlight'

import { CodeTabsClient } from './code-tabs-client'

export async function CodeTabs({
  id,
  label,
  tabs,
  lang = 'js',
}: {
  id: string
  label: string
  tabs: { label: string; code: string }[]
  lang?: Language
}) {
  const rendered = await Promise.all(tabs.map(async (tab) => ({ ...tab, html: await highlight(tab.code, lang) })))
  return <CodeTabsClient id={id} label={label} tabs={rendered} />
}
