import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

const KEYBOARD_HEIGHT = 300

const stubKeyboard = () => {
  const viewport = Object.assign(new EventTarget(), {
    height: window.innerHeight - KEYBOARD_HEIGHT,
    offsetTop: 0,
  })
  vi.stubGlobal('visualViewport', viewport)
  return viewport
}

const readRootVariable = (name: string) => document.documentElement.style.getPropertyValue(name)

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  it('Given an on-screen keyboard, should end the open sheet where the keyboard starts', async () => {
    const user = userEvent.setup()
    const viewport = stubKeyboard()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(readRootVariable('--visible-bottom')).toBe(`${window.innerHeight - KEYBOARD_HEIGHT}px`)
    expect(readRootVariable('--visible-height')).toBe(`${window.innerHeight - KEYBOARD_HEIGHT}px`)
    act(() => {
      viewport.height = window.innerHeight
      viewport.dispatchEvent(new Event('resize'))
    })
    expect(readRootVariable('--visible-bottom')).toBe(`${window.innerHeight}px`)
  })

  it('Given a browser that pans the visible area, should follow the panned bottom edge', async () => {
    const user = userEvent.setup()
    const viewport = stubKeyboard()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Open' }))

    act(() => {
      viewport.offsetTop = KEYBOARD_HEIGHT
      viewport.dispatchEvent(new Event('scroll'))
    })

    expect(readRootVariable('--visible-bottom')).toBe(`${window.innerHeight}px`)
  })

  it('Given a browser that shrinks the whole page for the keyboard, should not leave a gap above it', async () => {
    const user = userEvent.setup()
    const viewport = stubKeyboard()
    vi.stubGlobal('innerHeight', viewport.height)
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(readRootVariable('--visible-bottom')).toBe(`${viewport.height}px`)
  })

  it('Given a closed sheet, should stop following the keyboard', async () => {
    const user = userEvent.setup()
    stubKeyboard()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.keyboard('{Escape}')

    expect(readRootVariable('--visible-bottom')).toBe('')
    expect(readRootVariable('--visible-height')).toBe('')
  })
})
