import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import { Button } from '../button/button'

const renderDialog = () =>
  render(
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Change your settings</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>,
  )

describe('Dialog', () => {
  it('Given a closed dialog, should render no dialog', () => {
    renderDialog()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Given a click on the trigger, should open a dialog named and described by its parts', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('dialog', { name: 'Settings' })).toHaveAccessibleDescription(
      'Change your settings',
    )
  })

  it('Given an open dialog, should close on the close button', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Given an open dialog, should close on Escape', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
