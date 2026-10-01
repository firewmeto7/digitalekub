"use client";

import { useEffect, useState } from "react";
import type { ServiceHealth } from "@digitalekub/shared-types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [checking, setChecking] = useState(true);

  async function checkServices() {
    setChecking(true);
    try {
      const response = await fetch(`${apiUrl}/health`, { cache: "no-store" });
      setHealth(await response.json());
    } catch {
      setHealth(null);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void checkServices();
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Ekub Operations home"><span className="mark">E</span> EKUB <span className="wordmark-light">/ OPERATIONS</span></a>
        <span className="environment"><span className="environment-dot" /> LOCAL ENVIRONMENT</span>
      </header>

      <section className="content" aria-labelledby="page-title">
        <div className="heading-row">
          <div>
            <p className="eyebrow">PLATFORM FOUNDATION</p>
            <h1 id="page-title">Service status</h1>
          </div>
          <button className="refresh" type="button" onClick={() => void checkServices()} disabled={checking}>
            <span aria-hidden="true">↻</span> {checking ? "Checking" : "Refresh"}
          </button>
        </div>

        <div className={`status-banner ${health?.status === "ok" ? "is-ok" : "is-down"}`} aria-live="polite">
          <span className="status-indicator" />
          <div>
            <strong>{checking ? "Checking services" : health?.status === "ok" ? "All services operational" : "Service connection unavailable"}</strong>
            <p>{health ? `Last checked ${new Date(health.checkedAt).toLocaleTimeString()}` : "The API, database, or cache could not be reached."}</p>
          </div>
        </div>

        <div className="section-label"><span>DEPENDENCIES</span><span>LIVE CHECK</span></div>
        <div className="dependency-list" aria-live="polite">
          <Dependency name="API" state={checking ? "Checking" : health ? "Connected" : "Unavailable"} healthy={Boolean(health)} />
          <Dependency name="PostgreSQL" state={checking ? "Checking" : health?.dependencies.database === "ok" ? "Connected" : "Unavailable"} healthy={health?.dependencies.database === "ok"} />
          <Dependency name="Redis" state={checking ? "Checking" : health?.dependencies.redis === "ok" ? "Connected" : "Unavailable"} healthy={health?.dependencies.redis === "ok"} />
        </div>
        <p className="footnote">Status is read directly from the API and its connected services.</p>
      </section>
      <footer><span>EKUB PLATFORM</span><span>FOUNDATION</span></footer>
    </main>
  );
}

function Dependency({ name, state, healthy }: { name: string; state: string; healthy: boolean }) {
  return (
    <div className="dependency-row">
      <span className="dependency-name">{name}</span>
      <span className={`dependency-state ${healthy ? "healthy" : "unavailable"}`}><span />{state}</span>
    </div>
  );
}