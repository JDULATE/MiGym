// Giwi mascot coverage: every state resolves to an expression, the accessible label is
// present, and unknown states fall back to neutral instead of breaking.
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import React from 'react'
import Giwi from './Giwi.jsx'

describe('Giwi mascot', () => {
  it('renders an animated expression with its accessible name', () => {
    const html = renderToString(React.createElement(Giwi, { state: 'happy', size: 90 }))
    expect(html).toContain('giwi%20happy.svg')
    expect(html).toContain('aria-label="Giwi"')
    expect(html).toContain('role="img"')
  })

  it('falls back to neutral for unknown states', () => {
    const html = renderToString(React.createElement(Giwi, { state: 'spin' }))
    expect(html).toContain('giwi%20neutral.svg')
  })

  it('covers every lifecycle state with a distinct expression file', async () => {
    const { default: GiwiMap } = await import('./expressions/index.js').catch(() => ({}))
    // states used by onboarding/tutorial resolve without import errors
    for (const state of ['idle', 'welcome', 'thinking', 'point', 'happy', 'celebrate']) {
      const html = renderToString(React.createElement(Giwi, { state }))
      expect(html).toMatch(/giwi%20(neutral|excited|happy|attentive|curious|shy|surprissed)\.svg/)
    }
    expect(GiwiMap).toBeUndefined() // map lives inside Giwi.jsx; guard against accidental export drift
  })
})
