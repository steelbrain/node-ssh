'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { TabList } from './tab-list'

export interface PlayerEvent {
  t: number
  stream: 'stdout' | 'stderr'
  text: string
}

export interface PlayerSession {
  id: string
  title: string
  caption: ReactNode
  codeHtml: string
  lineCount: number
  events: PlayerEvent[]
  durationMs: number
}

type PlayState = 'idle' | 'playing' | 'done'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function seconds(ms: number, digits: number): string {
  return `${(ms / 1000).toFixed(digits)} s`
}

function Output({ events, running, prompt = true }: { events: PlayerEvent[]; running: boolean; prompt?: boolean }) {
  return (
    <pre className="font-mono text-[0.8125rem] leading-[1.65] break-words whitespace-pre-wrap">
      {prompt ? (
        <>
          <span className="text-term-dim select-none">$ </span>
          <span className="text-term-dim">node example.mjs</span>
          {'\n'}
        </>
      ) : null}
      {events.map((event, index) => (
        <span key={index} className={event.stream === 'stderr' ? 'text-term-dim' : undefined}>
          {event.text}
        </span>
      ))}
      {running ? (
        <span className="cursor text-term-accent" aria-hidden="true">
          ▍
        </span>
      ) : null}
    </pre>
  )
}

export function SessionPlayer({
  sessions,
  preambleHtml,
  preambleLineCount,
  epilogueHtml,
}: {
  sessions: PlayerSession[]
  preambleHtml: string
  preambleLineCount: number
  epilogueHtml: string
}) {
  const [active, setActive] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [state, setState] = useState<PlayState>('idle')
  const root = useRef<HTMLDivElement>(null)
  const output = useRef<HTMLDivElement>(null)
  const frame = useRef<number | null>(null)
  // The selected session, for the observer below, and whether anything has played yet
  const selected = useRef(0)
  const started = useRef(false)
  const session = sessions[active]
  // At desktop width, room for the longest example, so switching examples doesn't move the page
  const codeLines = preambleLineCount + Math.max(...sessions.map((item) => item.lineCount)) + 3

  const play = useCallback(
    (index: number) => {
      started.current = true
      if (frame.current != null) cancelAnimationFrame(frame.current)
      frame.current = null
      const { durationMs } = sessions[index]
      if (prefersReducedMotion()) {
        setElapsed(durationMs)
        setState('done')
        return
      }
      const start = performance.now()
      setElapsed(0)
      setState('playing')
      const step = () => {
        const ms = performance.now() - start
        if (ms >= durationMs) {
          frame.current = null
          setElapsed(durationMs)
          setState('done')
          return
        }
        setElapsed(ms)
        frame.current = requestAnimationFrame(step)
      }
      frame.current = requestAnimationFrame(step)
    },
    [sessions],
  )

  // Play the selected session once the player is on screen, unless one was already played
  useEffect(() => {
    const element = root.current
    if (element == null) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          if (!started.current) play(selected.current)
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (frame.current != null) cancelAnimationFrame(frame.current)
    }
  }, [play])

  const visible = state === 'idle' ? [] : session.events.filter((event) => event.t <= elapsed)

  // Keep the newest output in view
  useEffect(() => {
    const element = output.current
    if (element != null) element.scrollTop = element.scrollHeight
  }, [visible.length])

  function select(index: number) {
    selected.current = index
    setActive(index)
    play(index)
  }

  return (
    <div ref={root} className="term overflow-hidden rounded-lg border border-term-line bg-term-bg text-term-fg">
      <TabList
        id="demo"
        label="Examples"
        labels={sessions.map((item) => item.title)}
        selected={active}
        onSelect={select}
        tone="term"
        className="bg-term-surface px-1"
      />
      <div role="tabpanel" id="demo-panel" aria-labelledby={`demo-tab-${active}`}>
        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0 border-term-line lg:border-r">
            <p className="px-4 pt-3 font-mono text-xs text-term-dim">example.mjs</p>
            <div
              className="code-inline-padded pt-2 pb-4 lg:min-h-(--code-height)"
              style={{ '--code-height': `${codeLines * 0.8125 * 1.65}rem` } as CSSProperties}
            >
              <div className="code-dim" dangerouslySetInnerHTML={{ __html: preambleHtml }} />
              <div className="my-[1.65em]" dangerouslySetInnerHTML={{ __html: session.codeHtml }} />
              <div className="code-dim" dangerouslySetInnerHTML={{ __html: epilogueHtml }} />
            </div>
          </div>
          <div className="flex min-w-0 flex-col border-t border-term-line lg:border-t-0">
            <p className="flex justify-between gap-3 px-4 pt-3 font-mono text-xs text-term-dim">
              <span>Terminal</span>
              <span aria-hidden="true" className="tabular-nums">
                {state === 'idle' ? '' : seconds(elapsed, state === 'done' ? 2 : 1)}
              </span>
            </p>
            <div className="relative min-h-[10rem] flex-1">
              <div
                ref={output}
                role="log"
                aria-label="Output"
                tabIndex={0}
                className="max-h-[22rem] overflow-auto px-4 pt-2 pb-4 lg:absolute lg:inset-0 lg:max-h-none"
              >
                <Output events={visible} running={state === 'playing'} />
                <noscript>
                  <Output events={session.events} running={false} prompt={false} />
                </noscript>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-term-line bg-term-surface px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-[72ch] text-sm leading-relaxed text-term-fg/85">{session.caption}</p>
          <button
            type="button"
            onClick={() => play(active)}
            className="shrink-0 cursor-pointer self-start rounded border border-term-line px-2.5 py-1 font-mono text-xs text-term-fg hover:border-term-dim"
          >
            {state === 'playing' ? 'Restart' : 'Replay'}
            <span className="sr-only"> {session.title}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
