'use client'

import { useLayoutEffect, useRef } from 'react'

import { cn } from '../lib/cn'

export type SlidingPillProps = {
  activeKey: string
  className?: string
}

const ACTIVE_SELECTOR = '[data-active]'

const placePill = (pill: HTMLElement, container: HTMLElement) => {
  const active = container.querySelector<HTMLElement>(ACTIVE_SELECTOR)
  if (!active) {
    pill.removeAttribute('data-placed')
    return
  }
  pill.style.width = `${active.offsetWidth}px`
  pill.style.height = `${active.offsetHeight}px`
  pill.style.translate = `${active.offsetLeft}px ${active.offsetTop}px`
  if (!pill.hasAttribute('data-placed')) {
    pill.getBoundingClientRect()
    pill.setAttribute('data-placed', '')
  }
  container.setAttribute('data-pill-ready', '')
}

const followActiveItem = (pill: HTMLElement, container: HTMLElement) => {
  const place = () => placePill(pill, container)
  place()
  if (!('ResizeObserver' in window)) {
    return undefined
  }
  const observer = new ResizeObserver(place)
  observer.observe(container)
  const active = container.querySelector(ACTIVE_SELECTOR)
  if (active) {
    observer.observe(active)
  }
  return () => observer.disconnect()
}

export const SlidingPill = ({ activeKey, className }: SlidingPillProps) => {
  const pillRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const pill = pillRef.current
    const container = pill?.parentElement
    if (!pill || !container) {
      return undefined
    }
    return followActiveItem(pill, container)
  }, [activeKey])

  return (
    <span
      ref={pillRef}
      aria-hidden="true"
      data-pill=""
      className={cn(
        'pointer-events-none absolute top-0 left-0 opacity-0 data-placed:opacity-100 data-placed:glide',
        className,
      )}
    />
  )
}
