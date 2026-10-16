import { useEffect, useRef } from 'react';

/** Where buyers can reach Holly about a purchase, access or the product. */
export const SUPPORT_EMAIL = 'hello@thehairlossnutritionist.com';

/** Shown as "Last updated: …". Set to the date the terms are published; hidden while empty. */
export const TERMS_LAST_UPDATED = '';

/** Terms of Purchase and Use, as written by Holly. Linked from the footer. */
export function TermsPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const email = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

  return (
    <article className="prose-page" aria-labelledby="terms-title">
      <h2 id="terms-title" ref={headingRef} tabIndex={-1}>
        Terms of Purchase and Use
      </h2>
      {TERMS_LAST_UPDATED && <p className="small muted">Last updated: {TERMS_LAST_UPDATED}</p>}
      <p>
        These terms apply to Mane Meals: Meal &amp; Grocery Planner and digital products sold by The Hair Loss
        Nutritionist.
      </p>

      <h3>What you’re purchasing</h3>
      <p>
        Your purchase includes the products, features, and any bonuses expressly listed on the offer page at checkout.
        Different offers may include different products or bonuses.
      </p>
      <p>
        Mane Meals provides meal and snack ideas, ingredient lists, and grocery-planning tools. Unless expressly stated
        otherwise, it does not provide complete recipes, ingredient quantities, portion recommendations, or
        individualized meal plans. Preparation cues and time categories are approximate planning guidance, not tested
        recipe instructions or guaranteed cooking times.
      </p>

      <h3>Delivery and access</h3>
      <p>
        Digital products are supplied electronically through the download or access instructions provided after
        purchase.
      </p>
      <p>
        You are responsible for providing a working email address and using a compatible device and browser. Contact us
        if you do not receive your purchase or cannot access it.
      </p>
      <p>
        The access period and any recurring charges will be stated on the offer page before purchase. A one-time
        purchase does not create a subscription unless this is expressly disclosed.
      </p>

      <h3>Refunds and purchase problems</h3>
      <p>
        Because digital products are supplied electronically, we do not ordinarily offer refunds for a change of mind
        after the purchased content or access has been supplied.
      </p>
      <p>
        If you receive a duplicate charge, do not receive your purchase, or experience a technical problem that prevents
        access, contact {email} promptly, preferably within 10 days. We will investigate and correct the issue. If we
        cannot provide the purchased product or restore access within a reasonable time, we will provide an
        appropriate refund.
      </p>

      <h3>Personal use and sharing</h3>
      <p>
        Your purchase gives you a non-exclusive, non-transferable right to use the product for your own personal,
        non-commercial purposes.
      </p>
      <p>
        You may print downloaded resources for personal use and share grocery lists you create with members of your
        household or someone shopping for you.
      </p>
      <p>
        You may not resell, redistribute, publicly upload, or share the purchased guides, meal library, or private
        access credentials with others. Purchasing a product does not transfer ownership of its content.
      </p>

      <h3>General nutrition education</h3>
      <p>
        The products provide general nutrition education and planning support. They do not provide individualized
        medical nutrition therapy, diagnose or treat a condition, or replace advice from your own healthcare
        professional.
      </p>
      <p>
        Purchasing or using a product does not establish a dietitian–client relationship. No particular health outcome
        or hair regrowth is guaranteed.
      </p>
      <p>
        If you have a medical condition, a prescribed diet, or specific nutrition needs, discuss whether these ideas are
        suitable with your healthcare professional.
      </p>

      <h3>Allergies and food preparation</h3>
      <p>
        Ingredient filters and suggested substitutions cannot guarantee that a meal is suitable for every allergy,
        intolerance, or dietary restriction.
      </p>
      <p>
        Check food labels, ingredient details, and cross-contact information each time you shop or prepare food. Follow
        safe food-handling practices and appropriate cooking instructions. Short preparation cues are not complete
        food-safety instructions.
      </p>

      <h3>Saved plans and privacy</h3>
      <p>The planner’s handling of saved plans and personal information is explained in our Privacy Policy.</p>
      <p>
        Where plans are stored only in your browser, clearing browser data, changing browsers, or changing devices may
        make those plans unavailable. Save or export grocery lists you want to keep.
      </p>
      <p>Please do not include sensitive medical information in optional feedback.</p>

      <h3>Availability and changes</h3>
      <p>
        The online planner may occasionally be unavailable because of maintenance or technical problems. We may correct
        errors and improve its features.
      </p>
      <p>
        Changes will not remove rights promised with your purchase. If a change or discontinuation materially affects
        paid access, we will provide notice and any remedy required.
      </p>

      <h3>Questions and support</h3>
      <p>For purchase, access, or product questions, email {email}.</p>
    </article>
  );
}
