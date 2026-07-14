import { createElement } from 'react'
import { Navigate, useParams } from 'react-router-dom'

/** Legacy standalone app pages → map home + panel section. */
export function MapHomeSectionRedirect({ section }: { section: string }) {
  return createElement(Navigate, {
    to: `/?section=${encodeURIComponent(section)}`,
    replace: true,
  })
}

/** Legacy `/posts/:postId` detail page → map home with listing selected. */
export function MapHomePostRedirect() {
  const { postId } = useParams<{ postId: string }>()
  if (!postId) return createElement(Navigate, { to: '/', replace: true })
  return createElement(Navigate, {
    to: `/?post=${encodeURIComponent(postId)}`,
    replace: true,
  })
}

export function mapPostUrl(postId: string): string {
  return `/?post=${encodeURIComponent(postId)}`
}

export function mapSectionUrl(section: string): string {
  return `/?section=${encodeURIComponent(section)}`
}
