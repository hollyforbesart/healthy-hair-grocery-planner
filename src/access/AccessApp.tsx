import { useEffect, useRef, useState } from 'react';
import { track } from '../lib/analytics';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TermsPage } from '../pages/TermsPage';

/** Where "Get Mane Meals" goes: the sales page on Holly's website (its buy button opens Kit's checkout). */
export const PURCHASE_URL = 'https://thehairlossnutritionist.com/meal-and-grocery-planner/';

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

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; text: string; reason?: string };
type Step = { kind: 'email' } | { kind: 'code'; email: string; newAccount: boolean };

/** Where the planner sends someone after they sign in: the page they asked for, or the planner's home. */
const destination = () => (['/access', '/welcome'].includes(window.location.pathname.replace(/\/+$/, '')) ? '/' : window.location.href);

/** The access code from the welcome link (…/welcome#CODE), kept for this visit and taken out of the address bar. */
function codeFromLink(): string {
  const fromHash = decodeURIComponent(window.location.hash.replace(/^#/, '')).trim();
  try {
    if (fromHash) {
      sessionStorage.setItem('mm_welcome_code', fromHash);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    return fromHash || sessionStorage.getItem('mm_welcome_code') || '';
  } catch {
    return fromHash;
  }
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

const OFFLINE = 'You seem to be offline. Connect to the internet and try again.';

function SignInForm({ welcome }: { welcome: boolean }) {
  const linkCode = useRef(welcome ? codeFromLink() : '').current;
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState(linkCode);
  const [showAccessCode, setShowAccessCode] = useState(welcome && !linkCode);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [resent, setResent] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fieldRef.current?.focus();
  }, [step.kind]);

  const fail = (text: string, reason?: string) => {
    setStatus({ kind: 'error', text, reason });
    fieldRef.current?.focus();
  };

  const sendCode = async (again = false) => {
    if (!email.trim()) return fail('Enter your email address.');
    setStatus({ kind: 'busy' });
    try {
      const { ok, data } = await post('/api/auth/start', { email, code: accessCode || undefined });
      if (ok) {
        setStatus({ kind: 'idle' });
        setResent(again);
        setCode('');
        setStep({ kind: 'code', email: email.trim(), newAccount: Boolean(data.newAccount) });
        return;
      }
      if (data.reason === 'no-account' || data.reason === 'code') setShowAccessCode(true);
      fail(
        data.reason === 'no-account'
          ? welcome || accessCode
            ? 'There’s no Mane Meals account for this email yet. Enter the access code from your purchase email to set one up.'
            : 'We couldn’t find a Mane Meals account for this email. Check it’s the one you signed up with. Just bought Mane Meals? Add the access code from your purchase email.'
          : data.reason === 'code'
            ? 'That access code didn’t work. Check it against your purchase email.'
            : String(data.error ?? 'Something went wrong. Please try again.'),
        String(data.reason ?? ''),
      );
    } catch {
      fail(OFFLINE);
    }
  };

  const checkCode = async (signInEmail: string) => {
    if (code.replace(/\D/g, '').length !== 6) return fail('Enter the 6-digit code from the email.');
    setStatus({ kind: 'busy' });
    try {
      const { ok, data } = await post('/api/auth/verify', { email: signInEmail, code });
      if (ok) {
        track('signed_in', data.newAccount ? 'new' : 'returning');
        try {
          sessionStorage.removeItem('mm_welcome_code');
        } catch {
          // fine
        }
        window.location.replace(destination());
        return;
      }
      fail(String(data.error ?? 'Something went wrong. Please try again.'), String(data.reason ?? ''));
    } catch {
      fail(OFFLINE);
    }
  };

  const busy = status.kind === 'busy';
  const statusLine = (
    <p id="signin-status" className={`small ${status.kind === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
      {status.kind === 'error' ? status.text : ''}
    </p>
  );

  if (step.kind === 'code') {
    return (
      <form
        className="card access__form"
        onSubmit={(e) => {
          e.preventDefault();
          void checkCode(step.email);
        }}
      >
        <label htmlFor="signin-code">Enter the code we emailed you</label>
        <p className="small muted" id="signin-code-help">
          {resent ? 'We sent a new code to ' : 'We sent a 6-digit code to '}
          <strong>{step.email}</strong>. It can take a minute to arrive, so check your spam or promotions folder too.
        </p>
        <input
          ref={fieldRef}
          id="signin-code"
          className="access__code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          aria-describedby="signin-code-help signin-status"
          aria-invalid={status.kind === 'error'}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status.kind === 'error') setStatus({ kind: 'idle' });
          }}
        />
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Checking…' : step.newAccount ? 'Finish and open the planner →' : 'Open the planner →'}
        </button>
        {statusLine}
        <p className="small access__alt">
          <button type="button" className="link-btn" disabled={busy} onClick={() => void sendCode(true)}>
            Send a new code
          </button>
          <span aria-hidden="true"> · </span>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setStep({ kind: 'email' });
              setStatus({ kind: 'idle' });
            }}
          >
            Use a different email
          </button>
        </p>
      </form>
    );
  }

  return (
    <form
      className="card access__form"
      onSubmit={(e) => {
        e.preventDefault();
        void sendCode();
      }}
    >
      <label htmlFor="signin-email">{welcome ? 'Your email address' : 'Email address'}</label>
      <p className="small muted" id="signin-email-help">
        {welcome
          ? 'Use the email you bought Mane Meals with. You’ll use it to sign in on any device.'
          : 'We’ll email you a 6-digit code. No password needed.'}
      </p>
      <input
        ref={fieldRef}
        id="signin-email"
        type="email"
        autoComplete="email"
        aria-describedby="signin-email-help signin-status"
        aria-invalid={status.kind === 'error' && status.reason !== 'code'}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status.kind === 'error') setStatus({ kind: 'idle' });
        }}
      />
      {showAccessCode && (
        <>
          <label htmlFor="signin-access-code">Access code</label>
          <p className="small muted" id="signin-access-code-help">
            It’s in your purchase email. You only need it once, to set up your account.
          </p>
          <input
            id="signin-access-code"
            className="access__code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby="signin-access-code-help signin-status"
            aria-invalid={status.kind === 'error' && status.reason === 'code'}
            value={accessCode}
            onChange={(e) => {
              setAccessCode(e.target.value);
              if (status.kind === 'error') setStatus({ kind: 'idle' });
            }}
          />
        </>
      )}
      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? 'Sending…' : 'Email me a code →'}
      </button>
      {statusLine}
      {!showAccessCode && !welcome && (
        <p className="small access__alt">
          <button type="button" className="link-btn" onClick={() => setShowAccessCode(true)}>
            New here? I have an access code
          </button>
        </p>
      )}
      <p className="small muted">
        Need help? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </form>
  );
}

function AccessPage({ welcome }: { welcome: boolean }) {
  return (
    <div className="access">
      <div className="access__intro">
        <h2>{welcome ? 'Thanks for getting Mane Meals!' : 'Welcome to Mane Meals'}</h2>
        <p className="access__lead">
          {welcome
            ? 'Let’s set up your account. It takes a minute, and then you can open the planner on your phone, tablet or computer.'
            : 'Choose meal ideas, use what you have, and build your grocery list, with 100 dietitian-curated meals and snacks for hair health.'}
        </p>

        <SignInForm welcome={welcome} />

        {!welcome && (
          <div className="access__buy">
            <p>
              <strong>Don’t have Mane Meals yet?</strong>
            </p>
            <a className="btn btn--secondary" href={PURCHASE_URL} onClick={() => track('purchase_link')}>
              Get Mane Meals →
            </a>
          </div>
        )}
      </div>
      <img className="access__phone" src="/brand/mane-meals-phone.webp" alt="" width={480} height={823} />
    </div>
  );
}

export function AccessApp() {
  const page = window.location.pathname.replace(/\/+$/, '');
  const isTerms = page === '/terms';
  const welcome = page === '/welcome';
  useEffect(() => {
    track('page_view', isTerms ? 'terms' : welcome ? 'welcome' : 'access');
  }, [isTerms, welcome]);

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
            <AccessPage welcome={welcome} />
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
