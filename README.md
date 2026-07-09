# NovelShift

A single-page book storefront with reviews, a buyer/viewer + moderator sign-in
system, and a moderator-only book-editing panel — built as one self-contained
`index.html` file, backed by [Supabase](https://supabase.com) for
authentication and data.

## Live site

Hosted on GitHub Pages: `https://yourusername.github.io/your-repo-name/`
*(update this link once Pages is enabled — see below)*

## Features

- Featured book card (title, author, description, cover image, price,
  genre/format/pages/language/ISBN tags) — editable live by moderators
- Star-rating reviews from any signed-in visitor
- Two sign-in roles:
  - **Buyer/Viewer** — any email, via Supabase magic link
  - **Moderator** — restricted to specific email addresses, gated behind a
    password checked server-side via a Supabase Edge Function, then a
    magic-link sign-in
- Moderator powers: delete reviews, edit every field on the book card
- Built-in debug console (🐞 button) for viewing live logs/errors, gated
  behind its own password
- Session persists across page refreshes

## Tech stack

- Plain HTML/CSS/JavaScript — no build step, no framework
- [Supabase](https://supabase.com) for auth (magic links), database
  (`reviews`, `book_settings` tables), and an Edge Function for the
  moderator password check

## Setup

1. **Clone this repo** and open `index.html` directly, or serve it with any
   static file host.
2. **Supabase project**: this repo's `index.html` already points at a
   configured Supabase project (URL + anon key near the top of the
   `<script>` section). To run your own copy against a different project,
   replace those two values.
3. **Database tables** — run in the Supabase SQL editor:
   - `reviews` table with RLS (read: anyone; delete: moderator emails only)
   - `book_settings` table (id, title, author, description, cover_image_url,
     price, price_old, genre, pages, format, language, isbn) with RLS
     (read: anyone; write: moderator emails only)
4. **Moderator password Edge Function** — deploy `verify-mod-password`
   (see `supabase-functions/verify-mod-password/`) and set the
   `MODERATOR_PASSWORD` secret in your Supabase project.
5. **Auth redirect URLs** — in Supabase → Authentication → URL
   Configuration, add whatever URL(s) you're hosting this at (e.g. your
   GitHub Pages URL) to the allowed Redirect URLs list, or magic links
   won't redirect back correctly.

## Deploying on GitHub Pages

1. Push this repo to GitHub (`index.html` at the root, as it is here).
2. Repo → **Settings → Pages** → set source to your default branch, root
   folder.
3. GitHub gives you a URL like `https://yourusername.github.io/your-repo/`.
4. Add that URL to Supabase's Redirect URLs (step 5 above) or sign-in will
   silently fail.

## License

MIT — see [LICENSE](LICENSE). Free to use, modify, and share.
