import { Component } from 'react'

export class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error) {
    console.error('[MapErrorBoundary]', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 rounded-xl">
          <div className="text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="text-white font-semibold">Map temporarily unavailable</p>
            <p className="text-gray-400 text-sm mt-1">Please refresh the page</p>
            <button
              className="btn-primary mt-4"
              onClick={() => this.setState({ hasError: false })}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
