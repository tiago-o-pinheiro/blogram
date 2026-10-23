import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

describe('Card', () => {
  it('Given a composed card, should render heading, description, content and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    )

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('Given a class, should merge it over the defaults', () => {
    render(<Card data-testid="card" className="p-2" />)

    expect(screen.getByTestId('card')).toHaveClass('p-2', 'bg-card')
    expect(screen.getByTestId('card')).not.toHaveClass('p-6')
  })
})
