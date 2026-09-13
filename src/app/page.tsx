import Link from "next/link";
import { Brand, Footer } from "@/components/brand";
import { Preview } from "@/components/preview";
export default function Home() {
  return (
    <>
      <header className="public-nav">
        <Brand />
        <nav aria-label="Main">
          <a href="#how">How it works</a>
          <Link href="/signin">
            Sign in <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>
      <main className="landing">
        <section className="hero">
          <div className="eyebrow">
            <span className="dot" /> A clearer view of the trader network
          </div>
          <h1>
            Find the signal
            <br />
            behind the <em>handle.</em>
          </h1>
          <p>
            Start with an identity. Follow the observed connections.
            <br className="desktop-only" /> Put wallets and sampled performance
            in context.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/signin?returnTo=/app">
              Explore Lens Atlas <span aria-hidden="true">↗</span>
            </Link>
            <a className="text-link" href="/methodology">
              Understand the evidence →
            </a>
          </div>
          <p className="fine">
            Email verification · No wallet connection · No trade execution
          </p>
        </section>
        <section className="preview-panel" aria-label="Synthetic graph preview">
          <div className="panel-top">
            <div>
              <span className="eyebrow">THE IDENTITY MAP</span>
              <h2>A handle is just the beginning.</h2>
            </div>
            <span className="badge">Synthetic example</span>
          </div>
          <Preview />
          <div className="preview-bottom">
            <span>
              <i className="dot" /> Observed following relationships
            </span>
            <span>Illustrative data. No real trader results.</span>
          </div>
        </section>
        <section id="how" className="steps">
          <article>
            <span className="step-number">01 / SEARCH</span>
            <h2>Begin with a handle.</h2>
            <p>
              Bring an identity into focus. See its profile and the wallet
              mappings available in the observation.
            </p>
          </article>
          <article>
            <span className="step-number">02 / EXPLORE</span>
            <h2>Follow the connections.</h2>
            <p>
              Explore directed relationships at your own pace. You choose when
              to expand the map.
            </p>
          </article>
          <article>
            <span className="step-number">03 / COMPARE</span>
            <h2>Consider the evidence.</h2>
            <p>
              Compare sampled PnL and evidence coverage. See what is available,
              and what remains unknown.
            </p>
          </article>
        </section>
        <section className="independence">
          <h2>Context over conviction.</h2>
          <p>
            Lens Atlas is an independent application designed for use with
            Fomolens data. It is not affiliated with or endorsed by Fomolens or
            FOMO. Registration provides Lens Atlas access only; it does not
            create an upstream account or API allowance.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
