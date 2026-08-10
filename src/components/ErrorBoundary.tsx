import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

// ── App error boundary ───────────────────────────────────────────────────────
// Stops a thrown render/runtime error in any page from blanking the whole app.
// Wrapped around the routed <Outlet/> (keyed on pathname) so header/footer stay
// and navigating away clears the error.

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface it for debugging; a real app would report to Sentry/etc. here.
    console.error('UI error boundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <section className="container-suvadu py-20">
          <div className="card-surface mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-lilac text-royal text-3xl">⚠️</span>
            <h2 className="mt-6 font-display text-3xl text-plum">Something went wrong</h2>
            <p className="mt-2 max-w-sm font-body text-sm font-light text-muted-foreground">
              An unexpected error interrupted this page. You can try again, or head back home.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button onClick={() => this.setState({ error: null })} className="btn-primary">Try again</button>
              <Link to="/" className="btn-secondary" onClick={() => this.setState({ error: null })}>Go Home</Link>
            </div>
          </div>
        </section>
      )
    }
    return this.props.children
  }
}
