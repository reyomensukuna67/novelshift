-- ============================================================
-- Novelshift — Row Level Security (RLS) setup
-- Run this in Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- Why this matters: your SUPABASE_KEY in the HTML is public by design
-- (it's the "anon" key). Anyone can use it to call your database directly,
-- bypassing your website's buttons and forms entirely. RLS policies are
-- the only real security boundary — they run inside Supabase itself and
-- can't be skipped by editing browser code.


-- ============ REVIEWS TABLE ============
-- Goal: anyone can read reviews, anyone can post a review,
-- NOBODY can update or delete via the public anon key (deletes only
-- happen through admin.html, which still uses the same anon key —
-- see note at the bottom about tightening this further).

alter table reviews enable row level security;

drop policy if exists "Public can read reviews" on reviews;
create policy "Public can read reviews"
  on reviews for select
  using (true);

drop policy if exists "Public can insert reviews" on reviews;
create policy "Public can insert reviews"
  on reviews for insert
  with check (
    char_length(review_text) >= 10
    and char_length(review_text) <= 600
    and rating between 1 and 5
  );

-- Delete is allowed for now so admin.html's "Delete review" button works.
-- This is intentionally permissive because your setup has no per-request
-- moderator identity to check against — see the hardening note below.
drop policy if exists "Public can delete reviews" on reviews;
create policy "Public can delete reviews"
  on reviews for delete
  using (true);

-- No update policy created — nobody can edit an existing review, only
-- post new ones or delete them entirely. This is deliberate.


-- ============ ORDERS TABLE (bookings) ============
-- Goal: anyone can create a booking (insert), but nobody can read
-- other people's bookings or edit them — except admin.html, which
-- needs to read+update to show/manage bookings. Same caveat as above.

alter table orders enable row level security;

drop policy if exists "Public can insert orders" on orders;
create policy "Public can insert orders"
  on orders for insert
  with check (
    char_length(buyer_name) > 0
    and char_length(buyer_class) > 0
  );

-- Needed so admin.html can list bookings. See hardening note below.
drop policy if exists "Public can read orders" on orders;
create policy "Public can read orders"
  on orders for select
  using (true);

drop policy if exists "Public can update orders" on orders;
create policy "Public can update orders"
  on orders for update
  using (true);


-- ============ BOOK_SETTINGS TABLE ============
-- Goal: anyone can read the book listing (public site needs this),
-- anyone can update it via the anon key (needed for admin.html to save
-- changes, same caveat as above).

alter table book_settings enable row level security;

drop policy if exists "Public can read book_settings" on book_settings;
create policy "Public can read book_settings"
  on book_settings for select
  using (true);

drop policy if exists "Public can update book_settings" on book_settings;
create policy "Public can update book_settings"
  on book_settings for update
  using (true);

drop policy if exists "Public can insert book_settings" on book_settings;
create policy "Public can insert book_settings"
  on book_settings for insert
  with check (true);


-- ============================================================
-- ⚠️ IMPORTANT HONEST CAVEAT — read this, Viraj
-- ============================================================
-- Because admin.html uses the SAME public anon key as the main site
-- (just gated by a password check in the browser), the RLS policies
-- above CANNOT tell the difference between a real visitor and someone
-- who found your admin page. They use the identical database credentials.
--
-- This means: technically, someone who is good enough to open
-- DevTools → Network tab could copy your anon key and run the same
-- delete/update queries admin.html runs, without ever seeing your
-- password screen. The password protects the UI, not the database.
--
-- This is a REAL limitation, not a scare tactic — and it's a common
-- gap in small Supabase projects, so you're not alone in this. Two ways
-- to actually close it, when you're ready for the next step up:
--
-- 1. Move delete/update actions into Supabase Edge Functions (like your
--    verify-mod-password one) that check the password SERVER-SIDE before
--    running the query, using the service_role key (never exposed to the
--    browser). Then RLS can safely deny all public writes for those
--    actions, and only the edge function (not any visitor) can perform them.
--
-- 2. Use real Supabase Auth for just the moderator account (email+password
--    login, no public-facing UI for it), and write RLS policies that check
--    auth.uid() — e.g. "allow delete only if auth.uid() = '<your-mod-user-id>'".
--
-- For now, with a small personal project and a password only you know,
-- this setup is a reasonable middle ground — just know the password is a
-- speed bump for a casual visitor, not a lock against someone who knows
-- how to read Network requests. Worth revisiting as the site grows.
-- ============================================================
