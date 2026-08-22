// Giwi mascot smoke coverage: valid/unknown states, accessible label.
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import React from 'react'
import Giwi from './Giwi.jsx'

describe('Giwi mascot', () => {
  it('renders the accessible name and a known state class', () => {
    const html = renderToString(React.createElement(Giwi, { state: 'happy', size: 90 }))
    expect(html).toContain('giwi--happy')
    expect(html).toContain('aria-label="Giwi"')
    expect(html).toContain('role="img"')
  })

  it('falls back to the idle class for unknown states', () => {
    const html = renderToString(React.createElement(Giwi, { state: 'spin' }))
    expect(html).toContain('giwi--idle')
    expect(html).not.toContain('giwi--spin')
  })
})
