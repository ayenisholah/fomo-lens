"use client";
import Link from "next/link";
import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  applyResearchResult,
  refreshResearchMetadata,
  type ClientOperation,
} from "@/lib/research-client";
import { withResearchRequest } from "@/lib/request-lifecycle";
import { recoverRequest } from "@/lib/recovery-client";
import { Brand } from "./brand";
import { Graph } from "./graph";
import { exampleData, exampleProfile, examplePnl } from "@/lib/examples";
import {
  type Profile,
  type Pnl,
  type Wallets,
  type Social,
  type Leaderboard,
  type ResearchRequest,
  type Kind,
  schemas,
  windows,
  requestSchema,
  subjectSchema,
} from "@/lib/research-contract";
type Account = { email: string; owner: boolean; mode: "example" | "stored" };
type History = {
  id: string;
  kind: string;
  params: {
    subject?: string;
    address?: string;
    window?: (typeof windows)[number];
  };
  mode: string;
  status: string;
  createdAt: string;
};
type Allowance = {
  requestsUsed: number;
  creditsReservedOrUsed: number;
  requestLimit: null;
  creditLimit: null;
};
type Op = ClientOperation;
const exact = (n: number | null | undefined) =>
  n == null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(n);
const time = (s: string | null | undefined) =>
  s
    ? new Date(s).toISOString().replace("T", " ").replace(".000Z", " UTC")
    : "Unavailable";
const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;
export function Workspace({
  account,
  publicExample = false,
}: {
  account?: Account;
  publicExample?: boolean;
}) {
  const query = useSearchParams();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientHydrated,
    serverHydrated,
  );
  const router = useRouter();
  const selectionVersion = useRef(0);
  const pending = useRef(false);
  const lastRequest = useRef<ResearchRequest | null>(null);
  const lastRequestVersion = useRef(0);
  const seed =
    subjectSchema.safeParse(query.get("subject") ?? "example_trader").data ??
    "example_trader";
  const [subject, setSubject] = useState(seed),
    [search, setSearch] = useState(seed),
    [mode, setMode] = useState(account?.mode ?? "example");
  const [profiles, setProfiles] = useState<Record<string, Profile>>(
    mode === "example" ? { [seed]: exampleProfile(seed) } : {},
  );
  const [pnls, setPnls] = useState<Record<string, Pnl>>(
    mode === "example" ? { [seed]: examplePnl(seed) } : {},
  );
  const [wallets, setWallets] = useState<Wallets | null>(null),
    [social, setSocial] = useState<Social | null>(null),
    [coverage, setCoverage] = useState<ReturnType<
      typeof schemas.coverage.parse
    > | null>(null),
    [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [edges, setEdges] = useState<{ source: string; target: string }[]>([]),
    [tab, setTab] = useState("Graph"),
    [view, setView] = useState("Research"),
    [drawer, setDrawer] = useState(false);
  const [window, setWindow] = useState<(typeof windows)[number]>(
    windows.includes(query.get("window") as (typeof windows)[number])
      ? (query.get("window") as (typeof windows)[number])
      : "7d",
  );
  const [compare, setCompare] = useState<string[]>(
    (query.get("compare") ?? "")
      .split(",")
      .filter((s) => /^[a-zA-Z0-9_.-]{1,64}$/.test(s))
      .slice(0, 3),
  );
  const [history, setHistory] = useState<History[]>([]),
    [allowance, setAllowance] = useState<Allowance | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [address, setAddress] = useState(""),
    [lastOp, setLastOp] = useState<Op | null>(null);
  useEffect(() => {
    if (publicExample) return;
    let active = true;
    void refreshResearchMetadata({
      isCurrent: () => active,
      history: setHistory,
      allowance: setAllowance,
    });
    return () => {
      active = false;
    };
  }, [publicExample]);
  const profile = profiles[subject],
    pnl = pnls[subject];
  function applyResult(input: ResearchRequest, data: unknown) {
    applyResearchResult(input, data, {
      profile: (profile) => {
        setProfiles((p) => ({ ...p, [profile.subject]: profile }));
        setSubject(profile.subject);
        setSearch(profile.subject);
        setWallets(null);
        setSocial(null);
        setView("Research");
      },
      pnl: (data) => setPnls((p) => ({ ...p, [data.subject]: data })),
      wallets: setWallets,
      coverage: setCoverage,
      leaderboard: setLeaderboard,
      social: (data) => {
        setSocial(data);
        setProfiles((p) => ({
          ...p,
          ...Object.fromEntries(data.items.map((i) => [i.subject, i])),
        }));
        setEdges((old) =>
          [
            ...old,
            ...data.items.map((i) =>
              data.direction === "following"
                ? { source: data.subject, target: i.subject }
                : { source: i.subject, target: data.subject },
            ),
          ].filter(
            (e, i, all) =>
              all.findIndex(
                (x) => x.source === e.source && x.target === e.target,
              ) === i,
          ),
        );
      },
    });
  }
  async function refresh(version: number) {
    const current = () => version === selectionVersion.current;
    const ok = await refreshResearchMetadata({
      isCurrent: current,
      history: setHistory,
      allowance: setAllowance,
    });
    if (!ok && current())
      setMessage(
        "Results retained. History or allowance could not refresh; reload to update them.",
      );
  }
  async function run(
    kind: Kind,
    extra: Partial<ResearchRequest> = {},
  ): Promise<void> {
    const version = selectionVersion.current;
    await withResearchRequest({
      pending,
      setBusy,
      isCurrent: () => version === selectionVersion.current,
      onBegin: () => {
        setError("");
        setMessage("");
      },
      onError: (message) => {
        setError(message);
        setLastOp((op) =>
          op?.status === "running" ? { ...op, status: "uncertain" } : op,
        );
      },
      execute: async () => {
        const input = requestSchema.parse({
          id: crypto.randomUUID(),
          actionId: crypto.randomUUID(),
          kind,
          subject,
          window,
          ...extra,
        });
        lastRequest.current = input;
        lastRequestVersion.current = version;
        setLastOp(
          !publicExample && mode === "stored"
            ? { id: input.id, status: "running" }
            : null,
        );
        let data: unknown;
        if (publicExample) {
          data = exampleData(input, input.cursor ? Number(input.cursor) : 0);
        } else {
          const res = await fetch("/api/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(90000),
          });
          const json = await res.json();
          if (version !== selectionVersion.current) return;
          if (!res.ok || !json.ok) {
            setLastOp(json.operation ?? null);
            throw new Error(json.error?.message ?? "Research unavailable.");
          }
          if (json.data?.operation?.id !== input.id)
            throw Error("Research operation does not match request.");
          data = json.data.data;
          setMode(json.mode);
          setLastOp(json.data.operation);
        }
        if (version !== selectionVersion.current) return;
        applyResult(input, data);
        if (!publicExample) await refresh(version);
      },
    });
  }

  async function loadProfile(next = search) {
    await run("profile", { subject: next });
  }
  async function loadPnl(next = subject) {
    await run("pnl", { subject: next });
  }
  async function expand(
    cursor?: string,
    direction: "following" | "followers" = "following",
  ) {
    await run(direction, {
      cursor,
      subject: cursor ? social?.subject : subject,
    });
  }
  function select(next: string) {
    selectionVersion.current += 1;
    setLastOp(null);
    setError("");
    setMessage("");
    setSubject(next);
    setSearch(next);
    setWallets(null);
    setSocial(null);
    setTab("Profile");
  }
  function toggleCompare(next: string) {
    setCompare((c) =>
      c.includes(next)
        ? c.filter((x) => x !== next)
        : c.length < 3
          ? [...c, next]
          : c,
    );
    if (!publicExample)
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comparison" }),
      }).catch(() => {});
  }
  async function share() {
    try {
      const url = new URL(
        publicExample ? "/example" : "/app",
        globalThis.location.origin,
      );
      url.searchParams.set("subject", subject);
      url.searchParams.set("window", window);
      if (compare.length) url.searchParams.set("compare", compare.join(","));
      await navigator.clipboard.writeText(url.toString());
      setMessage(
        "Link copied. Opening it restores selections without stored requests.",
      );
      if (!publicExample)
        await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "sharing" }),
        });
    } catch {
      setError(
        "Clipboard unavailable. Copy the selections from your browser address instead.",
      );
    }
  }
  async function recovery() {
    if (!lastOp || publicExample || pending.current) return;
    const version = lastRequestVersion.current;
    const r = lastRequest.current;
    if (!r || r.id !== lastOp.id) return;
    await recoverRequest({
      operationId: lastOp.id,
      pending,
      setBusy,
      isCurrent: () => version === selectionVersion.current,
      onBegin: () => {
        setError("");
        setMessage("");
      },
      onError: setError,
      onResult: async (json) => {
        applyResult(r, json.data.data);
        setLastOp(json.data.operation);
        setMessage("Recovered results loaded.");
        await refresh(version);
      },
    });
  }
  return (
    <div className="app-shell" aria-busy={!hydrated} inert={!hydrated}>
      <aside className={"sidebar " + (drawer ? "open" : "")}>
        <Brand />
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Workspace">
          {["Research", "Leaderboard", "Compare", "History"].map((item, i) => (
            <button
              key={item}
              className={view === item ? "nav-active" : ""}
              onClick={() => {
                setView(item);
                setDrawer(false);
              }}
            >
              <span aria-hidden="true">{["◎", "▥", "⇄", "◷"][i]}</span>
              {item}
              {item === "Compare" && compare.length > 0 && (
                <span className="nav-count">{compare.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="badge">
            {mode === "example" ? "Synthetic example" : "Stored observations"}
          </span>
          <p>
            No automatic research.
            <br />
            Every expansion is your choice.
          </p>
          <Link href="/methodology">Methodology ↗</Link>
          <Link href="/privacy">Privacy ↗</Link>
          {account?.owner && <Link href="/admin">Owner dashboard ↗</Link>}
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <button
            className="mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={drawer}
            onClick={() => setDrawer(!drawer)}
          >
            ☰
          </button>
          <span className="breadcrumb">
            Workspace <span>/</span> {view}
          </span>
          <details className="account">
            <summary>{account?.email ?? "Example visitor"}</summary>
            {account ? (
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/auth/signout", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: "{}",
                    });
                    const json = await response.json();
                    if (!response.ok || !json.ok)
                      throw Error("Sign out failed. Try again.");
                    selectionVersion.current += 1;
                    router.replace("/");
                    router.refresh();
                  } catch {
                    setError("Sign out failed. Try again.");
                  }
                }}
              >
                Sign out
              </button>
            ) : (
              <Link href="/signin">Sign in</Link>
            )}
          </details>
        </header>
        <main className="workspace">
          <div className="workspace-title">
            <div>
              <span className="eyebrow">IDENTITY · CONNECTIONS · CONTEXT</span>
              <h1>
                {view === "Research"
                  ? "A closer look."
                  : view === "Compare"
                    ? "Side by side."
                    : view === "History"
                      ? "Your research trail."
                      : "Sampled leaderboard."}
              </h1>
              <p>
                {mode === "example"
                  ? "You’re exploring synthetic data. No real trader results or upstream credits."
                  : "Research is available after email verification. Choose each request explicitly; no research runs on page load."}
              </p>
            </div>
            <span className="badge">
              {mode === "example" ? "EXAMPLE DATA" : "STORED MODE"}
            </span>
          </div>
          <div role="status" className="notice">
            {busy ? "Research request in progress…" : message}
          </div>
          {error && (
            <div role="alert" className="error alert">
              {error}
            </div>
          )}
          {mode === "stored" && (
            <div className="cost-panel">
              Configured maximum reservations: profile 1 + PnL 2 credits;
              following/leaderboard up to 1/page; wallets up to 10; reverse up
              to 100. Mode:{" "}
              {mode === "stored" ? "stored research" : "synthetic examples"}.
              Upstream acceptance remains incomplete.
              {account?.owner && allowance && (
                <p>
                  Today: {allowance.requestsUsed} requests ·{" "}
                  {allowance.creditsReservedOrUsed} credits used or reserved.
                </p>
              )}
            </div>
          )}
          {view === "Research" && (
            <>
              <form
                className="search-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  void loadProfile();
                }}
              >
                <span aria-hidden="true">⌕</span>
                <label className="sr-only" htmlFor="subject">
                  Trader handle
                </label>
                <input
                  id="subject"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search a FOMO handle"
                  required
                />
                <button className="primary" disabled={busy}>
                  Explore profile →
                </button>
              </form>
              <div className="research-toolbar">
                <span className="mono">@{subject}</span>
                <div>
                  <button disabled={busy} onClick={() => void loadPnl()}>
                    Load PnL
                  </button>
                  <button disabled={busy} onClick={() => void expand()}>
                    Expand following
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void expand(undefined, "followers")}
                  >
                    Load followers
                  </button>
                  <button onClick={() => void share()}>Share ↗</button>
                </div>
              </div>
              <div
                className="mobile-tabs"
                role="tablist"
                aria-label="Research view"
              >
                {["Graph", "Profile", "Performance"].map((t) => (
                  <button
                    role="tab"
                    aria-selected={tab === t}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="research-grid">
                <section
                  className={
                    "map-panel mobile-" + (tab === "Graph" ? "show" : "hide")
                  }
                >
                  <div className="panel-top">
                    <h2>Observed network</h2>
                    <span className="fine">Directed following →</span>
                  </div>
                  <Graph
                    profiles={Object.values(profiles)}
                    edges={edges}
                    selected={subject}
                    onSelect={select}
                  />
                  <div className="connection-list">
                    <h3>Accessible connection list</h3>
                    {edges.length ? (
                      edges.map((e) => (
                        <div key={e.source + e.target}>
                          <button onClick={() => select(e.source)}>
                            @{e.source}
                          </button>
                          <span> follows → </span>
                          <button onClick={() => select(e.target)}>
                            @{e.target}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>
                        No connections loaded. Use “Expand following” to request
                        one page.
                      </p>
                    )}
                    {social && (
                      <>
                        <p>
                          {social.items.length === 0
                            ? "No records returned for this observation. This does not establish no connections."
                            : social.coverage}
                        </p>
                        <p>Observed: {time(social.observedAt)}</p>
                        {social.planLimitReached ? (
                          <p className="warning">Plan limit reached.</p>
                        ) : (
                          social.nextCursor && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                void expand(
                                  social.nextCursor!,
                                  social.direction,
                                )
                              }
                            >
                              Load next connections page
                            </button>
                          )
                        )}
                      </>
                    )}
                  </div>
                </section>
                <section
                  className={
                    "profile-panel mobile-" +
                    (tab === "Profile" ? "show" : "hide")
                  }
                >
                  <span className="eyebrow">TRADER PROFILE</span>
                  <div className="avatar">
                    {(profile?.name ?? subject).slice(0, 2).toUpperCase()}
                  </div>
                  <h2>{profile?.name ?? "Profile not loaded"}</h2>
                  <p className="mono">@{subject}</p>
                  <p>
                    {profile?.bio ??
                      "Use Explore profile to request this identity."}
                  </p>
                  <div className="profile-totals">
                    <div>
                      <strong>{profile?.followers ?? "Unavailable"}</strong>
                      <span>Profile followers</span>
                    </div>
                    <div>
                      <strong>{profile?.trades ?? "Unavailable"}</strong>
                      <span>Profile trades</span>
                    </div>
                  </div>
                  <p className="fine">
                    Profile observed: {time(profile?.observedAt)}
                    <br />
                    Profile totals are independent of PnL windows.
                  </p>
                  <button
                    className="full"
                    disabled={!compare.includes(subject) && compare.length >= 3}
                    onClick={() => toggleCompare(subject)}
                  >
                    {compare.includes(subject)
                      ? "Remove from comparison"
                      : "Add to comparison +"}
                  </button>
                  <hr />
                  <h3>Wallet mappings</h3>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      await run("wallets");
                    }}
                  >
                    Resolve wallets
                  </button>
                  {wallets && (
                    <>
                      {wallets.mappings.length === 0 && (
                        <p>No wallet mappings returned for this observation.</p>
                      )}
                      <p>
                        {wallets.count} mappings · {time(wallets.observedAt)}
                      </p>
                      {Array.from(
                        new Set(wallets.mappings.map((w) => w.chain)),
                      ).map((chain) => (
                        <div key={chain}>
                          <h4>{chain}</h4>
                          {wallets.mappings
                            .filter((w) => w.chain === chain)
                            .map((w, i) => (
                              <p className="wallet" key={i}>
                                {w.address}
                                <small>
                                  {w.subject
                                    ? "@" + w.subject
                                    : "Identity unavailable"}{" "}
                                  · {time(w.observedAt)}
                                </small>
                              </p>
                            ))}
                        </div>
                      ))}
                    </>
                  )}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await run("reverse", { address });
                    }}
                  >
                    <label htmlFor="wallet">Reverse wallet lookup</label>
                    <input
                      id="wallet"
                      value={address}
                      onChange={(e) => {
                        selectionVersion.current += 1;
                        setLastOp(null);
                        setWallets(null);
                        setAddress(e.target.value);
                      }}
                      placeholder="Wallet address"
                      minLength={10}
                      required
                    />
                    <button disabled={busy}>Find identity</button>
                  </form>
                  <a
                    className="fine"
                    href="https://fomolens.app"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fomolens public lookup ↗
                  </a>
                </section>
                <section
                  className={
                    "performance-panel mobile-" +
                    (tab === "Performance" ? "show" : "hide")
                  }
                >
                  <div className="panel-top">
                    <div>
                      <span className="eyebrow">SAMPLED PERFORMANCE</span>
                      <h2>Values, with context.</h2>
                    </div>
                    <span className="fine">USD</span>
                  </div>
                  <div className="pnl-cards">
                    {windows.map((w) => (
                      <button
                        key={w}
                        aria-pressed={window === w}
                        className={window === w ? "selected" : ""}
                        onClick={() => {
                          selectionVersion.current += 1;
                          setLastOp(null);
                          setWindow(w);
                          setLeaderboard(null);
                        }}
                      >
                        <span>{w === "all" ? "All time" : w}</span>
                        <strong>{exact(pnl?.windows[w])}</strong>
                      </button>
                    ))}
                  </div>
                  <table>
                    <caption>Exact sampled PnL values</caption>
                    <thead>
                      <tr>
                        <th>Window</th>
                        <th>Sampled USD PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {windows.map((w) => (
                        <tr key={w}>
                          <td>{w === "all" ? "All time" : w}</td>
                          <td className="mono">{exact(pnl?.windows[w])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="fine">
                    PnL observed: {time(pnl?.observedAt)} ·{" "}
                    {pnl?.coverage ?? "No PnL observation loaded."}
                  </p>
                  <div className="evidence">
                    <h3>Evidence coverage</h3>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        await run("coverage");
                      }}
                    >
                      Load aggregate coverage
                    </button>
                    {coverage && (
                      <p>
                        {coverage.identities ?? "Unavailable"} identities ·{" "}
                        {time(coverage.observedAt)} · {coverage.description}
                      </p>
                    )}
                    <p>
                      <strong>
                        {pnl
                          ? windows.filter((w) => pnl.windows[w] !== null)
                              .length
                          : 0}
                        /4
                      </strong>{" "}
                      PnL windows available
                    </p>
                    <p>
                      Wallet families:{" "}
                      {wallets
                        ? Array.from(
                            new Set(wallets.mappings.map((w) => w.chain)),
                          ).join(", ")
                        : "Not loaded"}
                    </p>
                    <p>
                      Social context: {social ? social.coverage : "Not loaded"}
                    </p>
                    <p className="fine">
                      Coverage does not establish skill, risk-adjusted returns,
                      endorsement, or complete trading history.
                    </p>
                  </div>
                </section>
              </div>
            </>
          )}
          {view === "Leaderboard" && (
            <section className="card">
              <div className="panel-top">
                <h2>One observation at a time.</h2>
                <label>
                  Window{" "}
                  <select
                    value={window}
                    onChange={(e) => {
                      selectionVersion.current += 1;
                      setLastOp(null);
                      setWindow(e.target.value as typeof window);
                      setLeaderboard(null);
                    }}
                  >
                    {windows.map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  await run("leaderboard");
                }}
              >
                Load leaderboard
              </button>
              {leaderboard && (
                <>
                  {leaderboard.items.length === 0 && (
                    <p>No leaderboard records returned for this observation.</p>
                  )}
                  <table>
                    <caption>
                      Sampled {leaderboard.window} PnL · up to ten records per
                      page
                    </caption>
                    <thead>
                      <tr>
                        <th>Identity</th>
                        <th>PnL · USD</th>
                        <th>Compare</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.items.map((i) => (
                        <tr key={i.profile.subject}>
                          <td>
                            <button
                              onClick={() => {
                                setProfiles((p) => ({
                                  ...p,
                                  [i.profile.subject]: i.profile,
                                }));
                                select(i.profile.subject);
                                setView("Research");
                              }}
                            >
                              @{i.profile.subject}
                            </button>
                          </td>
                          <td className="mono">
                            {exact(i.pnl)}
                            <small>
                              PnL: {time(i.fetchedAt)} · Profile:{" "}
                              {time(i.profile.observedAt)}
                            </small>
                          </td>
                          <td>
                            <button
                              aria-label={"Compare " + i.profile.subject}
                              disabled={
                                !compare.includes(i.profile.subject) &&
                                compare.length >= 3
                              }
                              onClick={() => toggleCompare(i.profile.subject)}
                            >
                              {compare.includes(i.profile.subject)
                                ? "Remove"
                                : "Add"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p>
                    {leaderboard.coverage} Observed:{" "}
                    {time(leaderboard.observedAt)}
                  </p>
                  {leaderboard.planLimitReached ? (
                    <p>Plan limit reached.</p>
                  ) : (
                    leaderboard.nextCursor && (
                      <button
                        disabled={busy}
                        onClick={async () => {
                          await run("leaderboard", {
                            cursor: leaderboard.nextCursor!,
                            window: leaderboard.window,
                          });
                        }}
                      >
                        Load next page
                      </button>
                    )
                  )}
                </>
              )}
            </section>
          )}
          {view === "Compare" && (
            <section className="card">
              <h2>Compare up to three identities</h2>
              <p>
                Selections are restored from shared links. Load evidence
                explicitly for each identity.
              </p>
              {compare.length === 0 ? (
                <p>Add an identity from its profile or the leaderboard.</p>
              ) : (
                <div className="comparison-grid">
                  {compare.map((s) => (
                    <article key={s}>
                      <h3>@{s}</h3>
                      <button disabled={busy} onClick={() => void loadPnl(s)}>
                        Load sampled PnL
                      </button>
                      <button onClick={() => toggleCompare(s)}>Remove</button>
                      <dl>
                        {windows.map((w) => (
                          <div key={w}>
                            <dt>{w}</dt>
                            <dd className="mono">
                              {exact(pnls[s]?.windows[w])}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p>
                        Coverage:{" "}
                        {pnls[s]
                          ? windows.filter((w) => pnls[s].windows[w] !== null)
                              .length
                          : 0}
                        /4 windows
                      </p>
                      <p className="fine">{time(pnls[s]?.observedAt)}</p>
                    </article>
                  ))}
                </div>
              )}
              <button onClick={() => void share()}>Share selections ↗</button>
            </section>
          )}
          {view === "History" && (
            <section className="card">
              <h2>Private recent research</h2>
              <p>
                Retained for 90 days. Selecting a record restores its handle and
                window or wallet address without executing research.
              </p>
              {publicExample ? (
                <p>Sign in to keep private research history.</p>
              ) : history.length === 0 ? (
                <p>Your research history will appear here.</p>
              ) : (
                <ul className="history">
                  {history.map((h) => (
                    <li key={h.id}>
                      <button
                        onClick={() => {
                          selectionVersion.current += 1;
                          setLastOp(null);
                          if (h.params.subject) select(h.params.subject);
                          if (h.params.address) {
                            setAddress(h.params.address);
                            setWallets(null);
                          }
                          if (h.params.window) {
                            setWindow(h.params.window);
                            setLeaderboard(null);
                          }
                          setView("Research");
                        }}
                      >
                        {" "}
                        {h.params.subject
                          ? "@" + h.params.subject
                          : (h.params.address ?? h.kind)}
                      </button>
                      <span>
                        {h.kind} · {h.mode} · {h.status}
                      </span>
                      <time>{time(h.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {lastOp && (
            <div className="operation-meta fine">
              <span>
                Operation {lastOp.id} · {lastOp.status}
                {account?.owner && (
                  <>
                    {" "}
                    · Cost:{" "}
                    {lastOp.actualCredits == null
                      ? "Unknown"
                      : lastOp.actualCredits + " credits"}
                  </>
                )}
              </span>
              {mode === "stored" && (
                <button disabled={busy} onClick={() => void recovery()}>
                  Explicit recovery
                </button>
              )}
            </div>
          )}
          <p className="workspace-foot">
            Observed evidence is a starting point for research.{" "}
            <Link href="/methodology">Read the methodology ↗</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
