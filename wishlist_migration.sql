-- ============================================================
-- Novelshift — Wish List feature (v2: price negotiation requests)
-- Run this in Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- If you already ran the earlier v1 wishlist_migration.sql (the
-- "suggest a book" version), run this first to reset the table
-- shape cleanly:
--
--   drop table if exists wishlist;
--
-- Then run everything below.

-- ============ WISHLIST TABLE ============
-- Private: a visitor who can't afford the current book submits their
-- contact info + the price they could pay. Nobody but you (via
-- admin.html) sees this list — it's not shown anywhere on the public site.

create table if not exists wishlist (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  phone text not null,
  offer_price text not null,
  note text,
  book_title text,
  created_at timestamptz not null default now()
);

alter table wishlist enable row level security;

-- No public read policy shown on the storefront — the site never
-- queries this table for display. admin.html reads it using the
-- same anon key, matching the permissive pattern your other admin
-- tables use (orders, reviews). The real access boundary is the
-- password gate in admin.html itself, same as your other admin data.
drop policy if exists "Public can read wishlist" on wishlist;
create policy "Public can read wishlist"
  on wishlist for select
  using (true);

drop policy if exists "Public can insert wishlist" on wishlist;
create policy "Public can insert wishlist"
  on wishlist for insert
  with check (
    char_length(name) > 0
    and char_length(email) > 0
    and char_length(phone) > 0
    and char_length(offer_price) > 0
  );

-- Needed so admin.html can delete entries once you've followed up.
drop policy if exists "Public can delete wishlist" on wishlist;
create policy "Public can delete wishlist"
  on wishlist for delete
  using (true);
