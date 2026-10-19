import { useEffect, useRef, useState } from 'react';
import { track } from '../lib/analytics';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TermsPage } from '../pages/TermsPage';

/**
 * Where "Get Mane Meals" goes: the Kit product or sales page. Until it's set,
 * the button goes to Holly's website instead.
 */
export const PURCHASE_URL = '';
const FALLBACK_URL = 'https://thehairlossnutritionist.com';

function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="site-header__home" href="/">
          <img className="site-header__mark" src="/brand/mane-meals-mark-light.png" alt="" width={152} height={144} />
          <span className="site-header__divider" aria-hidden="true" />
          <h1 className="site-header__title">
            <img className="site-header__wordmark" src="/brand/mane-meals-wordmark-light.png" alt="Mane Meals" width={464} height={72} />
            <span className="visually-hidden">: </span>
            <span className="site-header__product">Meal &amp; Grocery Planner</span>
          </h1>
        </a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <nav className="footer-links" aria-label="More information">
          <a href="/terms">Terms</a>
          <a href={PRIVACY_POLICY_URL}>Privacy</a>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
        </nav>
        <p className="small site-footer__copyright">© 2026 The Hair Loss Nutritionist</p>
      </div>
    </footer>
  );
}

type Status = { kind: 'idle' } | { kind: 'checking' } | { kind: 'error'; text: string };

function AccessForm() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!code.trim()) {
      setStatus({ kind: 'error', text: 'Enter the access code from your purchase email.' });
      inputRef.current?.focus();
      return;
    }
    setStatus({ kind: 'checking' });
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        track('access_granted');
        // Reload the page they asked for (or the planner's home), now with access.
        window.location.replace(window.location.pathname === '/access' ? '/' : window.location.href);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ kind: 'error', text: body.error ?? 'Something went wrong. Please try again.' });
    } catch {
      setStatus({ kind: 'error', text: 'You seem to be offline. Connect to the internet to enter your code.' });
    }
    inputRef.current?.focus();
  };

  const purchaseUrl = PURCHASE_URL || FALLBACK_URL;

  return (
    <div className="access">
      <div className="access__intro">
        <h2>Welcome to Mane Meals</h2>
        <p className="access__lead">
          Choose meal ideas, use what you have, and build your grocery list, with 100 dietitian-curated meals and snacks
          for hair health.
        </p>

        <form
          className="card access__form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="access-code">Access code</label>
          <p className="small muted" id="access-code-help">
            It’s in your purchase confirmation email. You only need to enter it once on each device.
          </p>
          <input
            ref={inputRef}
            id="access-code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby="access-code-help access-code-status"
            aria-invalid={status.kind === 'error'}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (status.kind === 'error') setStatus({ kind: 'idle' });
            }}
          />
          <button type="submit" className="btn btn--primary" disabled={status.kind === 'checking'}>
            {status.kind === 'checking' ? 'Checking…' : 'Open the planner →'}
          </button>
          <p id="access-code-status" className={`small ${status.kind === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
            {status.kind === 'error' ? status.text : ''}
          </p>
          <p className="small muted">
            Can’t find your code? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </form>

        <div className="access__buy">
          <p>
            <strong>Don’t have Mane Meals yet?</strong>
          </p>
          <a className="btn btn--secondary" href={purchaseUrl} onClick={() => track('purchase_link')}>
            {PURCHASE_URL ? 'Get Mane Meals →' : 'Learn more →'}
          </a>
        </div>
      </div>
      <img className="access__phone" src="/brand/mane-meals-phone.webp" alt="" width={480} height={823} />
    </div>
  );
}

export function AccessApp() {
  const isTerms = window.location.pathname.replace(/\/+$/, '') === '/terms';
  useEffect(() => {
    track('page_view', isTerms ? 'terms' : 'access');
  }, [isTerms]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <div className="container">
        <main id="main" className="main">
          {isTerms ? (
            <>
              <TermsPage />
              <p>
                <a href="/">← Back</a>
              </p>
            </>
          ) : (
            <AccessForm />
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
