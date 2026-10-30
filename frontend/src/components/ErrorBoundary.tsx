import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Error inesperado',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de interfaz', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
          <div className="card w-full max-w-md p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <TriangleAlert className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-ink">La interfaz encontró un problema</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {this.state.message || 'Recarga la página para continuar.'}
            </p>
            <Button
              className="mt-6"
              onClick={() => window.location.reload()}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Recargar página
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
