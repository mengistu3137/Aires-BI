import { Component } from 'react'
import { Button } from '../components/ui/button'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-background p-6">
          <div className="glass-panel max-w-lg p-6">
            <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
            <p className="mt-2 text-sm text-text-secondary">{this.state.errorMessage}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Reload App
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
