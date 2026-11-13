import type React from "react"
import { Icon } from "@/components/ui/Icon"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  fallback?: React.ReactNode
  onError?: (error: Error) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error)
    }
    // Log the error to an error reporting service
    console.error("Error capturado:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Icon
            name="server-crash"
            className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4"
            size={36}
          />
          <h2 className="text-2xl font-bold text-zinc-600 dark:text-zinc-400 mb-4">
            Algo salió mal
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Icon name="refresh-cw" className="h-4 w-4 mr-2" size={16} /> Reintentar
          </button>
        </div>
      )
    }

    return this.props.fallback ?? null
  }
}