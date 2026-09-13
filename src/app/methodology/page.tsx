import { Brand, Footer } from "@/components/brand";
export default function Methodology() {
  return (
    <>
      <header className="public-nav">
        <Brand />
      </header>
      <main className="prose">
        <span className="eyebrow">METHODOLOGY</span>
        <h1>Evidence, with its limits.</h1>
        <p>
          Lens Atlas brings identity observations together so you can examine
          their context. It does not score traders, recommend trades, or
          estimate investment suitability.
        </p>
        <h2>Two explicit data modes</h2>
        <p>
          Example views use deterministic synthetic identities and values.
          Stored views require approved application access and a verified
          upstream integration. A failed stored request never falls back to
          example data.
        </p>
        <h2>Sampled PnL</h2>
        <p>
          The four windows show available sampled values, not a fabricated time
          series. Missing values are unavailable, never zero. Profile totals are
          independent of PnL windows. Samples do not establish skill,
          risk-adjusted returns, or a complete trading history.
        </p>
        <h2>Observed identity and social data</h2>
        <p>
          Wallet mappings reflect available observations, not proof of current
          ownership or complete wallet coverage. Directed edges mean an observed
          following relationship. Social proximity does not establish
          endorsement. An empty page only means that no records were returned
          for that observation.
        </p>
        <h2>Evidence coverage</h2>
        <p>
          We display the number of available PnL windows, observed wallet
          families, independent profile and PnL timestamps, and social
          pagination context. Timestamps are exact observation times, not
          promises of freshness. Lists contain at most ten records per page.
          Plan limits and expired cursors stop pagination.
        </p>
        <h2>You control research</h2>
        <p>
          Selecting a graph node and opening a shared link do not initiate
          stored requests. Profile, PnL, wallet, social, and comparison actions
          require explicit controls. We do not poll, scan, or enrich in the
          background.
        </p>
      </main>
      <Footer />
    </>
  );
}
