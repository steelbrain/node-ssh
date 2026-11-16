import { bundledThemes, createHighlighter, type Highlighter, type ThemeRegistration } from 'shiki'

export type Language = 'js' | 'ts' | 'sh' | 'json'

const LANGUAGES = { js: 'javascript', ts: 'typescript', sh: 'shellscript', json: 'json' } as const

// The code backgrounds the colours have to work on: --surface in light mode, --surface in dark mode (the demo
// terminal's background is darker still)
const LIGHT_BACKGROUND = '#f1f3ee'
const DARK_BACKGROUND = '#161a17'
// WCAG AA for normal text is 4.5:1
const MIN_CONTRAST = 4.6

type Rgb = [number, number, number]

function parseHex(hex: string, background: Rgb): Rgb {
  let value = hex.replace('#', '')
  if (value.length === 3 || value.length === 4) {
    value = [...value].map((digit) => digit + digit).join('')
  }
  const rgb = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16)) as Rgb
  const alpha = value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1
  return rgb.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as Rgb
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

// Moves a colour towards black (light theme) or white (dark theme) until it reaches MIN_CONTRAST, keeping its hue
function readable(hex: string, backgroundHex: string): string {
  const background = parseHex(backgroundHex, [0, 0, 0])
  const target: Rgb = luminance(background) > 0.5 ? [0, 0, 0] : [255, 255, 255]
  const original = parseHex(hex, background)
  for (let step = 0; step <= 100; step += 1) {
    const mixed = original.map((channel, index) => channel + (target[index] - channel) * (step / 100)) as Rgb
    if (contrast(mixed, background) >= MIN_CONTRAST) return toHex(mixed)
  }
  return toHex(target)
}

async function readableTheme(name: 'vitesse-light' | 'vitesse-dark', background: string): Promise<ThemeRegistration> {
  const theme = (await bundledThemes[name]()).default
  const fix = (color: string | undefined) => (color == null ? color : readable(color, background))
  return {
    ...theme,
    name: `${name}-readable`,
    colors: { ...theme.colors, 'editor.foreground': fix(theme.colors?.['editor.foreground']) ?? '' },
    tokenColors: theme.tokenColors?.map((rule) => ({
      ...rule,
      settings: { ...rule.settings, foreground: fix(rule.settings.foreground) },
    })),
  }
}

let highlighter: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  highlighter ??= (async () =>
    createHighlighter({
      themes: [await readableTheme('vitesse-light', LIGHT_BACKGROUND), await readableTheme('vitesse-dark', DARK_BACKGROUND)],
      langs: Object.values(LANGUAGES),
    }))()
  return highlighter
}

// HTML for a <pre class="shiki">, with the light and dark colours of each token as CSS variables
export async function highlight(code: string, language: Language): Promise<string> {
  const instance = await getHighlighter()
  return instance.codeToHtml(code, {
    lang: LANGUAGES[language],
    themes: { light: 'vitesse-light-readable', dark: 'vitesse-dark-readable' },
    defaultColor: false,
  })
}
