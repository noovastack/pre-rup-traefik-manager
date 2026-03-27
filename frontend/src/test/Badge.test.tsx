import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Badge } from '../components/Badge'

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Running</Badge>)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('applies the green variant class', () => {
    render(<Badge variant="green">Active</Badge>)
    const el = screen.getByText('Active')
    expect(el.className).toContain('emerald')
  })

  it('applies the red variant class', () => {
    render(<Badge variant="red">Error</Badge>)
    const el = screen.getByText('Error')
    expect(el.className).toContain('rose')
  })

  it('defaults to gray variant', () => {
    render(<Badge>Unknown</Badge>)
    const el = screen.getByText('Unknown')
    expect(el.className).toContain('slate')
  })
})
