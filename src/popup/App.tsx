import { useEffect, useState, type FormEvent } from 'react';
import {
  defaults,
  estimateGrams,
  summarize,
  validSettings,
  type MeterState,
} from '../core/carbon';
import { isExtension, request } from './client';

export function App() {
  const [state, setState] = useState<MeterState | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'overview' | 'model'>('overview');
  const [busy, setBusy] = useState(false);
  const refresh = () =>
    request('read')
      .then(setState)
      .catch((e) => setError(String(e.message)));
  useEffect(() => {
    void refresh();
    if (!isExtension) return;
    const listener = () => {
      void refresh();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  async function update(
    type: 'reset' | 'settings',
    settings = state?.settings,
  ) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      setState(await request(type, settings));
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const settings = {
      ...state!.settings,
      intensity: Number(form.get('intensity')),
      energyPerGB: Number(form.get('energy')),
      intensitySource: 'User-defined assumption',
    };
    if (!validSettings(settings)) {
      setError(
        'Enter a valid intensity (0–3000) and energy factor (greater than 0, up to 10).',
      );
      return;
    }
    if (await update('settings', settings))
      setNotice('Model saved. All observed traffic uses these assumptions.');
  }
  async function fetchIntensity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const zone = String(
      new FormData(event.currentTarget).get('zone'),
    ).toUpperCase();
    try {
      const response = await fetch(
        `http://localhost:3000/api/intensity/${encodeURIComponent(zone)}`,
        { signal: AbortSignal.timeout(10000) },
      );
      const data = await response.json();
      if (
        !response.ok ||
        !Number.isFinite(data.carbonIntensity) ||
        data.carbonIntensity < 0 ||
        data.carbonIntensity > 3000 ||
        typeof data.datetime !== 'string'
      )
        throw new Error(
          'The local API is unavailable or the zone is unsupported.',
        );
      const saved = await update('settings', {
        ...state!.settings,
        intensity: data.carbonIntensity,
        intensitySource: `Electricity Maps · ${zone} · ${data.datetime}`,
      });
      if (saved)
        setNotice(
          'Grid intensity updated. Refresh it when you need a newer snapshot.',
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'green-meter.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const summary = state ? summarize(state) : null;
  return (
    <main>
      <header>
        <div className="brand">
          <span className="brand-icon">↗</span>
          <div>
            Green Meter<small>DIGITAL CARBON INTELLIGENCE</small>
          </div>
        </div>
        <span className="version">02</span>
      </header>
      {!isExtension && (
        <div className="demo">INTERACTIVE PREVIEW · SYNTHETIC DATA</div>
      )}
      <nav aria-label="Dashboard">
        <button
          aria-current={tab === 'overview' ? 'page' : undefined}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          aria-current={tab === 'model' ? 'page' : undefined}
          onClick={() => setTab('model')}
        >
          Estimation model
        </button>
      </nav>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {!state || !summary ? (
        <p role="status">Loading local observations…</p>
      ) : tab === 'overview' ? (
        <>
          <section className="hero">
            <div className="eyebrow">
              <span className={state.settings.paused ? 'dot paused' : 'dot'} />
              {state.settings.paused
                ? 'OBSERVATION PAUSED'
                : 'YOUR BROWSING FOOTPRINT'}
            </div>
            <h1>
              {summary.grams.toFixed(2)}
              <span>g CO₂e</span>
            </h1>
            <p>Estimated emissions from observed data transfer.</p>
            <div className="hero-bottom">
              <span>
                Since {new Date(state.startedAt).toLocaleDateString()}
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  void update('settings', {
                    ...state.settings,
                    paused: !state.settings.paused,
                  })
                }
              >
                {state.settings.paused ? 'Resume' : 'Pause'} tracking
              </button>
            </div>
          </section>
          <div className="stats">
            <section>
              <small>DATA OBSERVED</small>
              <strong>
                {(summary.bytes / 1e6).toFixed(1)} <span>MB</span>
              </strong>
            </section>
            <section>
              <small>RESPONSES MEASURED</small>
              <strong>{summary.requests.toLocaleString()}</strong>
            </section>
          </div>
          <section className="origins">
            <div className="section-heading">
              <h2>Where it adds up</h2>
              <span>BY DOMAIN</span>
            </div>
            {summary.rows.length ? (
              summary.rows.slice(0, 8).map((row) => (
                <div className="origin" key={row.origin}>
                  <div>
                    <span>{row.origin}</span>
                    <strong>
                      {estimateGrams(
                        row.bytes,
                        state.settings.intensity,
                        state.settings.energyPerGB,
                      ).toFixed(2)}{' '}
                      g
                    </strong>
                  </div>
                  <div className="track">
                    <div
                      style={{
                        width: `${summary.bytes ? (row.bytes / summary.bytes) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">
                <strong>Your next session starts here.</strong>
                <p>
                  Browse a few websites with the extension installed. Measurable
                  responses will appear here.
                </p>
              </div>
            )}
          </section>
          <aside>
            <strong>Make the invisible visible.</strong>
            <p>
              {state.unmeasured} responses had no usable size header. Cached
              responses, uploads, and streaming traffic are not fully captured.
            </p>
          </aside>
          <div className="actions">
            <button disabled={!summary.requests} onClick={exportData}>
              Export JSON ↗
            </button>
            <button
              className="subtle"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Delete all locally stored observations and start a new session?',
                  )
                )
                  void update('reset');
              }}
            >
              Reset observations
            </button>
          </div>
        </>
      ) : (
        <section className="model">
          <h1>A transparent model.</h1>
          <p>
            Explore how energy and grid assumptions change the estimate. This is
            an educational approximation.
          </p>
          <div className="formula">
            GB transferred × kWh / GB × g CO₂e / kWh
          </div>
          <form
            key={`${state.settings.intensity}-${state.settings.energyPerGB}`}
            onSubmit={saveModel}
          >
            <label>
              Grid intensity <span>g CO₂e / kWh</span>
              <input
                name="intensity"
                type="number"
                min="0"
                max="3000"
                step="any"
                defaultValue={state.settings.intensity}
                required
              />
            </label>
            <label>
              Transfer energy <span>kWh / GB</span>
              <input
                name="energy"
                type="number"
                min="0.000001"
                max="10"
                step="any"
                defaultValue={state.settings.energyPerGB}
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              Save assumptions
            </button>
          </form>
          <p className="caption">
            Source: {state.settings.intensitySource}. The default{' '}
            {defaults.intensity} g CO₂e/kWh is illustrative;{' '}
            {defaults.energyPerGB} kWh/GB is the original hackathon assumption,
            not a current universal coefficient. Changing these values
            recalculates the whole session.
          </p>
          <details>
            <summary>Connect a local grid-data API</summary>
            <p>
              Start the optional server with an Electricity Maps token. Only
              your selected zone is sent; domains stay on this device.
            </p>
            <form onSubmit={fetchIntensity}>
              <label>
                Electricity Maps zone
                <input
                  name="zone"
                  placeholder="CA-ON"
                  pattern="[A-Za-z0-9-]{2,20}"
                  required
                />
              </label>
              <button disabled={busy}>Fetch grid intensity</button>
            </form>
          </details>
        </section>
      )}
      <footer>
        <span>LOCAL BY DEFAULT</span>
        <span>Observe. Understand. Reduce.</span>
      </footer>
    </main>
  );
}
