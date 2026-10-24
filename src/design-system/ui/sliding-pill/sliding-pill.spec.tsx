import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SlidingPill } from './sliding-pill'

type PillGroupProps = { active: string }

const ITEMS = ['photos', 'videos', 'links']

const PillGroup = ({ active }: PillGroupProps) => (
  <div data-testid="group" className="relative">
    <SlidingPill activeKey={active} className="bg-card" />
    {ITEMS.map((item) => (
      <span key={item} data-active={item === active || undefined}>
        {item}
      </span>
    ))}
  </div>
)

const readPill = () => screen.getByTestId('group').querySelector('[data-pill]')

describe('SlidingPill', () => {
  it('Given an active item, should place itself and mark the group as ready', () => {
    render(<PillGroup active="videos" />)

    expect(readPill()).toHaveAttribute('data-placed')
    expect(screen.getByTestId('group')).toHaveAttribute('data-pill-ready')
  })

  it('Given a group without an active item, should hide itself', () => {
    const { rerender } = render(<PillGroup active="videos" />)

    rerender(<PillGroup active="none" />)

    expect(readPill()).not.toHaveAttribute('data-placed')
  })

  it('Given any active item, should stay hidden from assistive tech', () => {
    render(<PillGroup active="photos" />)

    expect(readPill()).toHaveAttribute('aria-hidden', 'true')
  })
})
