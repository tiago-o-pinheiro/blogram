import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Progress } from './progress'

describe('Progress', () => {
  it('Given a value and a label, should expose an accessible progressbar', () => {
    render(<Progress value={40} label="Uploading video" />)

    const bar = screen.getByRole('progressbar', { name: 'Uploading video' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
  })

  it('Given a value, should move the indicator with a transform', () => {
    const { container } = render(<Progress value={25} label="Uploading video" />)

    const indicator = container.querySelector('[data-state]:not([role])')
    expect(indicator).toHaveStyle({ transform: 'translateX(-75%)' })
  })

  it('Given a value out of range, should clamp it between 0 and 100', () => {
    render(<Progress value={250} label="Uploading video" />)

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})
