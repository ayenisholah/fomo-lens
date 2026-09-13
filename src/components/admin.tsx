"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "./brand";
type Data = {
  users: {
    id: string;
    email: string;
    createdAt: string;
    lastLoginAt: string;
    lastActivity: string | null;
    storedApproved: boolean;
  }[];
  active7: number;
  active30: number;
  counts: { mode: string; status: string; _count: number }[];
  budgets: { day: string; credits: number; requests: number }[];
  upstreamBalance: number | null;
  userLimit: number;
};
export function Admin() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    fetch("/api/admin")
      .then((r) => r.json())
      .then((j) => {
        if (mounted) {
          if (j.ok) setData(j.data);
          else setError(j.error.message);
        }
      })
      .catch(() => setError("Owner data unavailable."));
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <>
      <header className="public-nav">
        <Brand />
        <Link href="/app">Back to research</Link>
      </header>
      <main className="workspace">
        <span className="eyebrow">OWNER DASHBOARD</span>
        <h1>Application adoption.</h1>
        <p role="alert" className="error">
          {error}
        </p>
        {data ? (
          <>
            <div className="steps">
              <article>
                <h2>{data.active7}</h2>
                <p>Active users · 7 days</p>
              </article>
              <article>
                <h2>{data.active30}</h2>
                <p>Active users · 30 days</p>
              </article>
              <article>
                <h2>{data.upstreamBalance ?? "Unavailable"}</h2>
                <p>Latest observed upstream balance</p>
              </article>
            </div>
            <section className="card table-scroll">
              <h2>Verified users</h2>
              <p>
                Up to {data.userLimit} most recent accounts. All verified
                accounts have immediate research access.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Signup</th>
                    <th>Last login</th>
                    <th>Last activity</th>
                    <th>Stored access</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.createdAt}</td>
                      <td>{u.lastLoginAt}</td>
                      <td>{u.lastActivity ?? "Unavailable"}</td>
                      <td>Verified</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card">
              <h2>Research request outcomes · retained 90 days</h2>
              {data.counts.map((c) => (
                <p key={c.mode + c.status}>
                  {c.mode} · {c.status}: {c._count}
                </p>
              ))}
              <h2>Service usage</h2>
              {data.budgets.length ? (
                data.budgets.map((b) => (
                  <p key={b.day}>
                    {b.day}: {b.requests} requests, {b.credits} credits used or
                    reserved
                  </p>
                ))
              ) : (
                <p>No stored usage.</p>
              )}
            </section>
          </>
        ) : (
          <p>Loading owner data…</p>
        )}
      </main>
    </>
  );
}
