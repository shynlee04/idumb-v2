import { Component, type ErrorInfo, type ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console in development for debugging
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught:", error, info.componentStack)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-6 py-4">
            <h2 className="mb-2 text-lg font-semibold text-rose-200">Something went wrong</h2>
            <p className="mb-4 max-w-md text-sm text-rose-300/80">
              {this.state.error?.message || "An unexpected error occurred in the dashboard."}
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded border border-rose-400/40 bg-rose-500/20 px-4 py-1.5 text-sm text-rose-100 transition-colors hover:bg-rose-500/30"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
