import { Link } from 'react-router-dom'
import NotebookCover from '@/components/NotebookCover'

export default function NotFound() {
  return (
    <section className="gradient-hero">
      <div className="container-suvadu flex flex-col items-center py-24 text-center">
        <div className="w-32 rotate-[-6deg] shadow-lift">
          <NotebookCover colour="#613092" pattern="mono" customText="404" />
        </div>
        <p className="eyebrow mt-10">Page not found</p>
        <h1 className="mt-3 font-display text-5xl text-plum">This page is a blank page.</h1>
        <p className="mt-4 max-w-md font-body text-base font-light text-muted-foreground">
          The link may be broken or the page may have moved — but there are plenty of beautiful notebooks waiting to be written in.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary btn-lg">Back to Home</Link>
          <Link to="/collections" className="btn-secondary btn-lg">Shop Collections</Link>
        </div>
      </div>
    </section>
  )
}
