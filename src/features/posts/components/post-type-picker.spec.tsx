import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { PostTypePicker } from './post-type-picker'

type HarnessProps = {
  isDisabled?: boolean
}

const Harness = ({ isDisabled = false }: HarnessProps) => {
  const [type, setType] = useState<Models.PostType>('photo')

  return (
    <PostTypePicker
      legend="What are you posting?"
      value={type}
      isDisabled={isDisabled}
      onChange={setType}
    />
  )
}

const renderPicker = (props: HarnessProps = {}, locale: 'en' | 'es' = 'en') =>
  render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <Harness {...props} />
    </I18nProvider>,
  )

describe('PostTypePicker', () => {
  it('Given the legend, should name the radiogroup after it', () => {
    renderPicker()

    expect(screen.getByRole('radiogroup', { name: 'What are you posting?' })).toBeInTheDocument()
  })

  it('Given the five post types, should offer one named radio for each', () => {
    renderPicker()

    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('radio', { name: 'Photo' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Video' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'YouTube' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Link' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'News' })).not.toBeChecked()
  })

  it('Given the es locale, should name the radios in spanish', () => {
    renderPicker({}, 'es')

    expect(screen.getByRole('radio', { name: 'Foto' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Enlace' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Noticia' })).toBeInTheDocument()
  })

  it('Given a click on another type, should select it and clear the previous one', async () => {
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByRole('radio', { name: 'Video' }))

    expect(screen.getByRole('radio', { name: 'Video' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Photo' })).not.toBeChecked()
  })

  it('Given the arrow keys, should move the selection between types', async () => {
    const user = userEvent.setup()
    renderPicker()
    screen.getByRole('radio', { name: 'Photo' }).focus()

    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('radio', { name: 'Video' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Video' })).toHaveFocus()

    await user.keyboard('{ArrowLeft}')

    expect(screen.getByRole('radio', { name: 'Photo' })).toBeChecked()
  })

  it('Given the disabled prop, should disable every radio', () => {
    renderPicker({ isDisabled: true })

    screen.getAllByRole('radio').forEach((radio) => {
      expect(radio).toBeDisabled()
    })
  })
})
