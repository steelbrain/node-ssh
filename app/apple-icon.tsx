import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// The same prompt and cursor as app/icon.svg, on a full square (iOS rounds the corners itself)
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0c0e0d' }}>
      <svg width="180" height="180" viewBox="0 0 512 512">
        <path
          d="M149 152 265 256 149 360"
          fill="none"
          stroke="#5fdc8a"
          strokeWidth="60"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="317" y="146" width="76" height="220" rx="10" fill="#5fdc8a" />
      </svg>
    </div>,
    size,
  )
}
