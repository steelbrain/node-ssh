import { highlight, type Language } from '@/lib/highlight'

import { CopyButton } from './copy-button'

export async function Code({ code, lang = 'js', title }: { code: string; lang?: Language; title?: string }) {
  const html = await highlight(code, lang)

  return (
    <figure className="relative my-5 rounded-md border border-line bg-surface">
      {title != null ? (
        <figcaption className="flex items-center justify-between gap-3 border-b border-line py-1 pr-2 pl-4 font-mono text-xs text-fg-muted">
          <span>{title}</span>
          <CopyButton text={code} />
        </figcaption>
      ) : (
        <CopyButton text={code} className="absolute top-1.5 right-2 bg-surface" />
      )}
      <div className="code-padded" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  )
}
