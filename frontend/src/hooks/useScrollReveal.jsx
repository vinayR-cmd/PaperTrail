import { useEffect, useRef } from 'react'

export default function useScrollReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      },
      {
        threshold: 0.15,
      }
    )

    const currentEl = ref.current
    if (currentEl) {
      // If element is already in the viewport on mount, reveal it immediately
      const rect = currentEl.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        currentEl.classList.add('visible')
      } else {
        observer.observe(currentEl)
      }
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl)
      }
      observer.disconnect()
    }
  }, [])

  return ref
}
