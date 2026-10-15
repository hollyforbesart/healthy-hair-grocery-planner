import { useEffect, useRef } from 'react';

/**
 * Where buyers can reach Holly about a purchase. Leave empty to point people
 * to their purchase confirmation email instead.
 */
export const SUPPORT_EMAIL = '';

/** Short terms: purchases and refunds, health disclaimer, and privacy. Linked from the footer. */
export function TermsPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const contact = SUPPORT_EMAIL ? (
    <>
      email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    </>
  ) : (
    'reply to your purchase confirmation email'
  );

  return (
    <article className="prose-page" aria-labelledby="terms-title">
      <h2 id="terms-title" ref={headingRef} tabIndex={-1}>
        Terms
      </h2>
      <p className="small muted">Last updated October 15, 2026</p>

      <h3>Digital products: all sales final</h3>
      <p>
        Mane Meals: Meal &amp; Grocery Planner and other digital products are delivered instantly after purchase.
        Because of this, all sales are final and non-refundable once access has been provided. By completing your
        purchase, you agree to receive immediate access and acknowledge that you can’t cancel or get a refund after
        that, to the extent permitted by law.
      </p>
      <p>
        If you were charged more than once, or you can’t access your purchase because of a technical problem on our
        end, {contact} within 14 days and we’ll fix it or refund you.
      </p>
      <p>Nothing in this policy limits any rights you have under applicable consumer law.</p>

      <h3>Not medical advice</h3>
      <p>
        Meal ideas are general suggestions for planning your groceries. They are not medical or nutritional advice and
        aren’t a substitute for care from your own healthcare provider. If you have allergies, always check product
        labels; the planner can’t guarantee that ingredients are allergen-free.
      </p>

      <h3>Your information</h3>
      <p>
        Your plan is saved in this browser on this device. It isn’t uploaded, and clearing your browser data erases it.
        The only information that leaves your device is feedback you choose to send, which is emailed to us.
      </p>
    </article>
  );
}
