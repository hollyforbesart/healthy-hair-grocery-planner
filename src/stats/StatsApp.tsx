import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stats } from '../lib/analyticsStats';
import type { accountStats } from '../lib/accounts';

type Accounts = Awaited<ReturnType<typeof accountStats>>;
type Data = Stats & { accounts: Accounts };

const KEY_STORAGE = 'mm_stats_key';
const RANGES = [7, 30, 90, 365] as const;

const readKey = () => {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
};
const saveKey = (key: string) => {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // the key then lasts for this visit only
  }
};

const fmt = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : n.toLocaleString('en-US'));
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');
const shortDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Every day from `from` to `to`, so quiet days show as zero rather than disappearing. */
function allDays(from: string, to: string): string[] {
  const days: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/** A clean top for the y-axis: 1, 2, 5, 10, 20, 50… */
function niceMax(n: number): number {
  if (n <= 4) return Math.max(n, 1);
  const p = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= n)!;
}

function Tile({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="stats-tile">
      <p className="stats-tile__label">{label}</p>
      <p className="stats-tile__value">{typeof value === 'number' ? fmt(value) : value}</p>
      {note && <p className="stats-tile__note">{note}</p>}
    </div>
  );
}

/** The width of an element in CSS pixels, so the chart's text stays a readable size on any screen. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** One series per day as columns, with a hover/focus readout and a table view. */
function DailyChart({ title, rows }: { title: string; rows: { day: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [chartRef, W] = useWidth<HTMLDivElement>(640);
  const max = niceMax(Math.max(0, ...rows.map((r) => r.value)));
  const H = 190;
  const left = 32;
  const bottom = 22;
  const plotW = W - left - 8;
  const plotH = H - bottom - 8;
  const slot = plotW / Math.max(rows.length, 1);
  const barW = Math.min(24, Math.max(2, slot - 2));
  const y = (v: number) => 8 + plotH - (v / max) * plotH;
  const labelEvery = Math.ceil(rows.length / Math.max(2, Math.floor(plotW / 64)));
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <section className="card stats-card">
      <div className="stats-card__head">
        <h3>{title}</h3>
        <p className="stats-readout small" role="status">
          {hover !== null && !asTable ? (
            <>
              {shortDay(rows[hover].day)}: <strong>{rows[hover].value}</strong>
            </>
          ) : (
            ''
          )}
        </p>
        <button type="button" className="link-btn small" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {total === 0 ? (
        <p className="muted small">Nothing yet in this period.</p>
      ) : asTable ? (
        <div className="stats-table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>{title}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day}>
                  <td>{shortDay(r.day)}</td>
                  <td>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stats-chart" ref={chartRef}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${title}, per day`} onMouseLeave={() => setHover(null)}>
            {[0, max / 2, max].map((t) => (
              <g key={t}>
                <line x1={left} x2={W - 8} y1={y(t)} y2={y(t)} className="stats-grid" />
                <text x={left - 6} y={y(t) + 4} textAnchor="end" className="stats-axis">
                  {Number.isInteger(t) ? fmt(t) : ''}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const x = left + i * slot + (slot - barW) / 2;
              const h = 8 + plotH - y(r.value);
              const radius = Math.min(4, barW / 2, h);
              return (
                <g
                  key={r.day}
                  tabIndex={0}
                  aria-label={`${shortDay(r.day)}: ${r.value}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                >
                  <rect x={left + i * slot} y={8} width={slot} height={plotH} fill="transparent" />
                  {r.value > 0 && (
                    <path
                      className={hover === i ? 'stats-bar stats-bar--on' : 'stats-bar'}
                      d={`M${x},${8 + plotH} V${y(r.value) + radius} q0,-${radius} ${radius},-${radius} H${x + barW - radius} q${radius},0 ${radius},${radius} V${8 + plotH} Z`}
                    />
                  )}
                  {i % labelEvery === 0 && (
                    <text x={left + i * slot + slot / 2} y={H - 6} textAnchor="middle" className="stats-axis">
                      {shortDay(r.day)}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={left} x2={W - 8} y1={8 + plotH} y2={8 + plotH} className="stats-baseline" />
          </svg>
        </div>
      )}
    </section>
  );
}

/** A ranked list as horizontal bars, values at the tip. */
function BarList({
  title,
  rows,
  empty = 'Nothing yet in this period.',
  note,
}: {
  title: string;
  rows: { label: string; count: number; note?: string }[];
  empty?: string;
  note?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="card stats-card">
      <h3>{title}</h3>
      {note && <p className="muted small">{note}</p>}
      {rows.length === 0 ? (
        <p className="muted small">{empty}</p>
      ) : (
        <ol className="stats-bars">
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${r.count}`}>
              <span className="stats-bars__label">{r.label}</span>
              <span className="stats-bars__track">
                <span className="stats-bars__fill" style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className="stats-bars__value">
                {fmt(r.count)}
                {r.note && <span className="muted"> {r.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function KeyForm({ onSave, error }: { onSave: (key: string) => void; error?: string }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="card access__form"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value.trim());
      }}
    >
      <label htmlFor="stats-key">Dashboard key</label>
      <p className="small muted" id="stats-key-help">
        The <code>STATS_KEY</code> you saved in Cloudflare. It’s remembered on this device only.
      </p>
      <input id="stats-key" type="password" autoComplete="current-password" aria-describedby="stats-key-help stats-key-error" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="submit" className="btn btn--primary">
        Show my stats →
      </button>
      <p id="stats-key-error" className="small error" role="status">
        {error ?? ''}
      </p>
    </form>
  );
}

const TOP_LISTS: { event: string; title: string }[] = [
  { event: 'meal_added', title: 'Most-added meals' },
  { event: 'favorite_added', title: 'Most-favorited meals' },
  { event: 'search', title: 'What people search for' },
  { event: 'food_added', title: 'Foods people have in their kitchen' },
  { event: 'extra_added', title: 'Optional ingredients added' },
  { event: 'recipe_link', title: '“Find a recipe” taps' },
  { event: 'leave_out_group', title: 'Food groups left out' },
  { event: 'leave_out_food', title: 'Single foods left out' },
  { event: 'time_filter', title: 'Time filters used' },
  { event: 'meal_type_filter', title: 'Meal-type filters used' },
  { event: 'week_slot_set', title: 'What goes on “My week”' },
];

const SOURCE_LABELS: Record<string, string> = { code: 'Bought (access code)', guest: 'Guest list', kit: 'Kit buyer tag' };

function Dashboard({ data }: { data: Data }) {
  const a = data.accounts;
  const h = data.headline;
  const days = allDays(data.from, data.to);
  const activeByDay = new Map(a.daily.map((d) => [d.day, d]));
  const eventsByDay = new Map(data.daily.map((d) => [d.day, d]));
  const period = data.days === 365 ? 'the last year' : `the last ${data.days} days`;

  return (
    <>
      <section className="stats-hero" aria-labelledby="hero-label">
        <p id="hero-label" className="stats-tile__label">
          People who used Mane Meals in {period}
        </p>
        <p className="stats-hero__value">{fmt(a.activeInRange)}</p>
        <p className="stats-tile__note">
          Out of {fmt(a.total)} {a.total === 1 ? 'account' : 'accounts'} in total.
        </p>
      </section>

      <h2 className="stats-section">People</h2>
      <div className="stats-tiles">
        <Tile label="Active today" value={a.activeToday} />
        <Tile label="Active in the last 7 days" value={a.activeLast7Days} />
        <Tile label="Active in the last 30 days" value={a.activeLast30Days} />
        <Tile label={`New accounts, ${period}`} value={a.newInRange} />
        <Tile label="Used it on 2 or more days" value={a.returningInRange} note={`in ${period}`} />
        <Tile
          label="Came back after their first week"
          value={pct(a.cameBackAfterFirstWeek.cameBack, a.cameBackAfterFirstWeek.accounts)}
          note={`${a.cameBackAfterFirstWeek.cameBack} of ${a.cameBackAfterFirstWeek.accounts} accounts at least a week old`}
        />
      </div>

      <DailyChart title="People using the planner" rows={days.map((day) => ({ day, value: activeByDay.get(day)?.activeUsers ?? 0 }))} />

      <h2 className="stats-section">What they do</h2>
      <div className="stats-tiles">
        <Tile label="Planner opens" value={h.plannerOpens} />
        <Tile label="Meals added" value={h.mealsAdded} />
        <Tile label="Grocery lists viewed" value={h.listsViewed} />
        <Tile label="Lists shared, copied or printed" value={h.listsSharedCopiedPrinted} />
        <Tile label="New weeks planned" value={h.newWeeksPlanned} />
        <Tile label="“Find a recipe” taps" value={h.recipeLinksOpened} />
        <Tile label="Installed as an app" value={h.appInstalls} />
        <Tile label="Feedback sent" value={h.feedbackSent} />
        <Tile label="“My week” opens" value={h.weekPlanOpens} />
        <Tile label="Week spots filled by hand" value={h.weekSlotsFilled} />
        <Tile label="“Fill in my meals” used" value={h.weekFills} />
        <Tile label="“Also add it to…” used" value={h.weekRepeats} />
        <Tile label="Weeks printed" value={h.weekPrints} />
      </div>

      <DailyChart title="Meals added" rows={days.map((day) => ({ day, value: eventsByDay.get(day)?.mealsAdded ?? 0 }))} />

      <BarList
        title="From opening the planner to a grocery list"
        note="How far people get through the steps. Percentages are of planner opens."
        rows={data.funnel.map((f) => ({ label: f.step, count: f.count, note: pct(f.count, data.funnel[0].count) }))}
      />

      <h2 className="stats-section">Favorites and searches</h2>
      <div className="stats-grid-2">
        {TOP_LISTS.filter((t) => (data.top[t.event] ?? []).length > 0).map((t) => (
          <BarList key={t.event} title={t.title} rows={(data.top[t.event] ?? []).slice(0, 10).map((r) => ({ label: r.label, count: r.count }))} />
        ))}
      </div>
      {TOP_LISTS.every((t) => (data.top[t.event] ?? []).length === 0) && <p className="muted small">These fill in as people use the planner.</p>}

      <h2 className="stats-section">Devices and sign-ups</h2>
      <div className="stats-grid-2">
        <BarList
          title="Devices (page views)"
          rows={[
            { label: 'Phone', count: data.devices.mobile ?? 0 },
            { label: 'Computer', count: data.devices.desktop ?? 0 },
            { label: 'Installed app', count: data.devices.app ?? 0 },
          ].filter((r) => r.count > 0)}
        />
        <BarList
          title="Sign-in page"
          rows={[
            { label: 'Sign-in page views', count: h.signInPageViews },
            { label: 'Welcome page views (after buying)', count: h.welcomePageViews },
            { label: 'Sign-ins', count: h.signIns },
            { label: '“Get Mane Meals” taps', count: h.getManeMealsClicks },
          ]}
        />
        <BarList
          title="How accounts were created"
          note="All time."
          rows={Object.entries(a.bySource).map(([source, count]) => ({ label: SOURCE_LABELS[source] ?? source, count }))}
        />
        <BarList
          title="Accounts per access code"
          note="All time. Compare with your Kit sales: far more accounts than sales means the code is being shared."
          rows={a.byAccessCode.map((c) => ({ label: `Code ${c.code.slice(0, 6)}…`, count: c.count }))}
        />
      </div>
    </>
  );
}

export function StatsApp() {
  const [key, setKey] = useState(readKey);
  const [days, setDays] = useState<number>(30);
  const [site, setSite] = useState<'live' | 'preview'>('live');
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<{ kind: 'idle' | 'loading' } | { kind: 'error'; text: string }>({ kind: 'idle' });

  const load = useCallback(async () => {
    if (!key) return;
    setState({ kind: 'loading' });
    try {
      const res = await fetch(`/api/stats?days=${days}&env=${site}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
      if (res.status === 401) {
        saveKey('');
        setKey('');
        setState({ kind: 'error', text: 'That key didn’t work. Check it against STATS_KEY in Cloudflare.' });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as Data);
      setState({ kind: 'idle' });
    } catch {
      setState({ kind: 'error', text: 'Couldn’t load the numbers. Check your connection and try again.' });
    }
  }, [key, days, site]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          <a className="site-header__home" href="/">
            <img className="site-header__mark" src="/brand/mane-meals-mark-light.png" alt="" width={152} height={144} />
            <span className="site-header__divider" aria-hidden="true" />
            <h1 className="site-header__title">
              <img className="site-header__wordmark" src="/brand/mane-meals-wordmark-light.png" alt="Mane Meals" width={464} height={72} />
              <span className="visually-hidden">: </span>
              <span className="site-header__product">Usage stats</span>
            </h1>
          </a>
        </div>
      </header>
      <div className="container">
        <main id="main" className="main stats">
          {!key ? (
            <>
              <h2>Your Mane Meals stats</h2>
              <KeyForm
                error={state.kind === 'error' ? state.text : undefined}
                onSave={(k) => {
                  saveKey(k);
                  setKey(k);
                }}
              />
            </>
          ) : (
            <>
              <div className="stats-controls" role="group" aria-label="Period and site">
                <div className="stats-segmented" role="radiogroup" aria-label="Period">
                  {RANGES.map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={days === r} className="chip" aria-pressed={days === r} onClick={() => setDays(r)}>
                      {r === 365 ? '1 year' : `${r} days`}
                    </button>
                  ))}
                </div>
                <div className="stats-segmented" role="radiogroup" aria-label="Site">
                  {(['live', 'preview'] as const).map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={site === s} className="chip" aria-pressed={site === s} onClick={() => setSite(s)}>
                      {s === 'live' ? 'Live site' : 'Test previews'}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn btn--secondary btn--small" onClick={() => void load()} disabled={state.kind === 'loading'}>
                  {state.kind === 'loading' ? 'Loading…' : 'Refresh'}
                </button>
              </div>
              {state.kind === 'error' && (
                <p className="error" role="status">
                  {state.text}
                </p>
              )}
              {data && <Dashboard data={data} />}
              {data && (
                <p className="small muted stats-footnote">
                  Updated {new Date(data.generatedAt).toLocaleString()}. Days are in UTC. Activity counts come from anonymous usage
                  events, so people with “Do Not Track” turned on aren’t included; people and accounts come from sign-ins.{' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      saveKey('');
                      setKey('');
                      setData(null);
                    }}
                  >
                    Forget the key on this device
                  </button>
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
