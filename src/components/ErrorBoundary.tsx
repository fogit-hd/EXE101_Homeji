import { Component, type ErrorInfo, type ReactNode } from 'react'
import { SYSTEM_ERROR_MESSAGE, getErrorMessage } from '../lib/errors'
import './ErrorBoundary.css'

type Props = {
  children: ReactNode
  fallback?: ReactNode
  /** true = F5 trang; false = chỉ remount cây con */
  reloadOnRetry?: boolean
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleRetry = () => {
    if (this.props.reloadOnRetry !== false) {
      window.location.reload()
      return
    }
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="app-error" role="alert">
          <div className="app-error__card">
            <p className="app-error__message">
              {getErrorMessage(this.state.error, SYSTEM_ERROR_MESSAGE)}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleRetry}
            >
              Thử lại
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
