import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback: ReactNode
  onError?: () => void
}

type State = { failed: boolean }

/** Isolates Maps/WebGL crashes so the listing pane stays usable. */
export class ExploreMapBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError?.()
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}
