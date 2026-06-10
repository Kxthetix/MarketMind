import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock the StockChart component to prevent Jest from resolving lightweight-charts ESM module
jest.mock('@/components/StockChart', () => {
  return function DummyStockChart() {
    return <div data-testid="mock-stock-chart" />
  }
})

import { MarkdownRenderer } from './stock/[symbol]/page'

describe('MarkdownRenderer Component', () => {
  it('renders main headers correctly', () => {
    render(<MarkdownRenderer content="# Main Report Title" />)
    const header = screen.getByRole('heading', { level: 2 })
    expect(header).toBeInTheDocument()
    expect(header).toHaveTextContent('Main Report Title')
  })

  it('renders sub headers correctly', () => {
    render(<MarkdownRenderer content="## Executive Summary" />)
    const header = screen.getByRole('heading', { level: 3 })
    expect(header).toBeInTheDocument()
    expect(header).toHaveTextContent('Executive Summary')
  })

  it('renders list items correctly', () => {
    const markdown = `- Technical Setup\n- Sentiment Analysis`
    render(<MarkdownRenderer content={markdown} />)
    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(2)
    expect(listItems[0]).toHaveTextContent('Technical Setup')
  })

  it('renders bold elements correctly', () => {
    render(<MarkdownRenderer content="The stock is in a **Strong Buy** range." />)
    const boldEl = screen.getByText('Strong Buy')
    expect(boldEl.tagName).toBe('STRONG')
  })

  it('renders standard paragraphs', () => {
    render(<MarkdownRenderer content="This is standard market intelligence report text." />)
    const para = screen.getByText(/standard market intelligence/)
    expect(para.tagName).toBe('P')
  })
})
