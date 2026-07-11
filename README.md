# Novelshift

A single-book, cash-on-delivery storefront for *Lost in the Loop* by
Srihan Kayshap — a peach-and-cream themed, no-login-required site backed by
[Supabase](https://supabase.com), with a separate password-gated admin panel.

## Live site

Hosted on GitHub Pages: `https://<yourusername>.github.io/<your-repo-name>/`
*(update this link to match your actual Pages URL, and see the CNAME file
if you're using a custom domain)*

## How it works

- **No sign-in required.** Anyone can browse the book, read reviews, and
  place a booking without creating an account.
- **Cash on Delivery only.** No online payment is processed. A visitor who
  wants the book fills out the booking modal (name, class, email, a
  password of their choosing, and acceptance of the Terms and Service),
  which creates an order in Supabase. Payment happens in person when the
  book is delivered.
- **Booking status check.** Using the email + password set at booking time,
  a visitor can check their order status later on the same page.
- **Wish List.** A private "can't afford it right now" form — visitors
  submit their name, email, phone, and an offer price. Nothing here is
  shown publicly; submissions are visible only in `admin.html`.
- **Reviews.** Any visitor can leave a star rating + review; no login
  needed.
- **Admin panel (`admin.html`).** Password-gated (client-side password
  check, not tied to Supabase auth) for the site owner to view/manage
  orders, delete reviews, edit the book's details, and browse Wish List
  submissions with click-to-contact email/WhatsApp links.

## Tech stack

- Plain HTML/CSS/JavaScript — no build step, no framework
- [Supabase](https://supabase.com) for the database and Edge Functions
- Supabase tables: `book_settings`, `reviews`, `orders`, `wishlist`,
  `profiles` (currently unused by the live flow)
- Supabase Edge Functions (deployed on the Supabase side, not in this
  repo): `create-booking`, `check-booking-status`, `check-cart-status`,
  `get-orders`, `update-order-status`, `delete-order`, `verify-mod-password`

## Setup

1. **Clone this repo** and open `index.html` directly, or serve it with any
   static file host.
2. **Supabase project**: `index.html` and `admin.html` already point at a
   configured Supabase project (URL + anon key near the top of each
   `<script>` section). To run your own copy against a different project,
   replace those values in both files.
3. **Database tables** — run these in the Supabase SQL editor:
   - `book_settings` (id, title, author, description, cover_image_url,
     price, price_old, genre, pages, format, language, isbn)
   - `reviews` (name, city, rating, review_text)
   - `orders` (buyer_name, buyer_class, book_title, price, status, email,
     password_hash)
   - `wishlist` — see `wishlist_migration.sql` in this repo. **Run this
     file as-is**; it includes a `drop table if exists wishlist;` guard in
     case an older schema version exists.
   - `rls_policies.sql` in this repo covers the RLS setup for the other
     tables.
4. **Edge Functions** — deploy `create-booking`, `check-booking-status`,
   `check-cart-status`, `get-orders`, `update-order-status`, and
   `delete-order` to your Supabase project. These handle booking
   creation/lookup and admin order management server-side.
5. **Admin password** — the admin panel's password check is handled
   separately (see `verify-mod-password`); set that up in Supabase before
   relying on `admin.html`.

## Terms and Service

The booking modal requires visitors to accept the site's Terms and Service
before confirming a booking. The link currently points to an externally
hosted document (see the `href` on the "Terms and Service" link inside the
`#book-cod-gate` modal in `index.html`) — update that link if the hosted
document's URL changes.

## Deploying on GitHub Pages

1. Push this repo to GitHub (`index.html` at the root, as it is here).
2. Repo → **Settings → Pages** → set source to your default branch, root
   folder.
3. GitHub gives you a URL like `https://yourusername.github.io/your-repo/`.
4. If you're using a custom domain, make sure the `CNAME` file in this repo
   matches it.

## License

All Rights Reserved — see [LICENSE](LICENSE). This code is not licensed for
reuse, copying, or redistribution.
