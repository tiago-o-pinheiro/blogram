import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Switch } from './switch'

describe('Switch', () => {
  it('Given a label, should name the switch after it', () => {
    render(<Switch label="AI writing assistance" />)

    expect(screen.getByRole('switch', { name: 'AI writing assistance' })).not.toBeChecked()
  })

  it('Given a click, should toggle and report the new state', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Switch label="AI writing assistance" onCheckedChange={onCheckedChange} />)

    await user.click(screen.getByRole('switch', { name: 'AI writing assistance' }))

    expect(screen.getByRole('switch')).toBeChecked()
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('Given a description, should describe the switch with it', () => {
    render(<Switch label="AI" description="Drafts your posts" />)

    expect(screen.getByRole('switch')).toHaveAccessibleDescription('Drafts your posts')
  })

  it('Given the disabled prop, should not toggle', async () => {
    const user = userEvent.setup()
    render(<Switch label="AI" disabled />)

    await user.click(screen.getByRole('switch'))

    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByRole('switch')).not.toBeChecked()
  })
})
