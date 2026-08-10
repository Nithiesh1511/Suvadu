-- ============================================================================
-- SUVADU Notebooks — Admin Panel schema (Dev Brief §9/§10)
-- Run in the Supabase SQL Editor after 0001_init.sql and 0002_razorpay.sql.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING).
-- Relies on public.is_admin() from 0001_init.sql.
-- ============================================================================

-- ── coupons ──────────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  code         text primary key,
  discount_pct numeric not null check (discount_pct > 0 and discount_pct <= 100),
  active       boolean not null default true,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ── colours ──────────────────────────────────────────────────────────────────
create table if not exists public.colours (
  name       text primary key,
  hex        text not null,
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── faqs ─────────────────────────────────────────────────────────────────────
create table if not exists public.faqs (
  id         uuid primary key default gen_random_uuid(),
  category   text not null,
  question   text not null,
  answer     text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── reviews ──────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  text,                       -- null = general/site testimonial
  author_name text not null,
  rating      int not null check (rating between 1 and 5),
  text        text not null,
  location    text,
  status      text not null default 'pending',  -- pending | approved | rejected
  created_at  timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews(product_id);
create index if not exists reviews_status_idx on public.reviews(status);

-- ── banners ──────────────────────────────────────────────────────────────────
create table if not exists public.banners (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  subtitle   text not null default '',
  image_url  text,
  link       text,
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── contact_requests ─────────────────────────────────────────────────────────
create table if not exists public.contact_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  message    text not null,
  status     text not null default 'new',   -- new | resolved
  created_at timestamptz not null default now()
);
create index if not exists contact_requests_status_idx on public.contact_requests(status);

-- ── admin_activity_log ───────────────────────────────────────────────────────
create table if not exists public.admin_activity_log (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid references auth.users(id) on delete set null,
  action     text not null,
  entity     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_log_created_idx on public.admin_activity_log(created_at desc);

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.coupons            enable row level security;
alter table public.colours            enable row level security;
alter table public.faqs               enable row level security;
alter table public.reviews            enable row level security;
alter table public.banners            enable row level security;
alter table public.contact_requests   enable row level security;
alter table public.admin_activity_log enable row level security;

-- coupons: read active (or any if admin); admin writes.
drop policy if exists coupons_read  on public.coupons;
drop policy if exists coupons_write on public.coupons;
create policy coupons_read  on public.coupons for select using (active or public.is_admin());
create policy coupons_write on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- colours: read active (or any if admin); admin writes.
drop policy if exists colours_read  on public.colours;
drop policy if exists colours_write on public.colours;
create policy colours_read  on public.colours for select using (active or public.is_admin());
create policy colours_write on public.colours for all using (public.is_admin()) with check (public.is_admin());

-- faqs: public read; admin writes.
drop policy if exists faqs_read  on public.faqs;
drop policy if exists faqs_write on public.faqs;
create policy faqs_read  on public.faqs for select using (true);
create policy faqs_write on public.faqs for all using (public.is_admin()) with check (public.is_admin());

-- reviews: read approved (or any if admin); signed-in users submit as pending; admin manages.
drop policy if exists reviews_read   on public.reviews;
drop policy if exists reviews_insert on public.reviews;
drop policy if exists reviews_admin  on public.reviews;
create policy reviews_read   on public.reviews for select using (status = 'approved' or public.is_admin());
create policy reviews_insert on public.reviews for insert with check (auth.uid() is not null and status = 'pending');
create policy reviews_admin  on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- banners: read active (or any if admin); admin writes.
drop policy if exists banners_read  on public.banners;
drop policy if exists banners_write on public.banners;
create policy banners_read  on public.banners for select using (active or public.is_admin());
create policy banners_write on public.banners for all using (public.is_admin()) with check (public.is_admin());

-- contact_requests: anyone can submit; only admins can read/update/delete.
drop policy if exists contact_insert on public.contact_requests;
drop policy if exists contact_admin  on public.contact_requests;
create policy contact_insert on public.contact_requests for insert with check (true);
create policy contact_admin  on public.contact_requests for all using (public.is_admin()) with check (public.is_admin());

-- admin_activity_log: admins only.
drop policy if exists admin_log_read   on public.admin_activity_log;
drop policy if exists admin_log_insert on public.admin_activity_log;
create policy admin_log_read   on public.admin_activity_log for select using (public.is_admin());
create policy admin_log_insert on public.admin_activity_log for insert with check (public.is_admin());

-- orders: allow admins to update status (customers already have owner read + insert).
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());
create index if not exists orders_status_idx on public.orders(status);

-- ============================================================================
-- Seed static content so the admin modules start populated (matches the app's
-- previous hardcoded data in src/data/products.ts).
-- ============================================================================

-- Colours (§5)
insert into public.colours (name, hex, sort_order) values
  ('Ivory White', '#FFFFF0', 0),
  ('Beige', '#F5F0E8', 1),
  ('Sand', '#C2B280', 2),
  ('Sage Green', '#B2AC88', 3),
  ('Lavender', '#E6E6FA', 4),
  ('Blush Pink', '#FF8DA1', 5),
  ('Charcoal Black', '#36454F', 6),
  ('Muted Terracotta', '#C98B72', 7),
  ('Warm Cream', '#FFFDD0', 8),
  ('Powder Blue', '#B0D4E8', 9)
on conflict (name) do nothing;

-- Coupons
insert into public.coupons (code, discount_pct) values
  ('SUVADU10', 10),
  ('MARK15', 15),
  ('WELCOME', 20)
on conflict (code) do nothing;

-- Reviews (approved testimonials shown on the home page)
insert into public.reviews (author_name, rating, text, location, status) values
  ('Ananya R.', 5, 'The paper quality is unreal — no bleed-through with my fountain pen. The lilac cover is even prettier in person.', 'Bengaluru', 'approved'),
  ('Karthik M.', 5, 'Ordered a personalised set for my partner. The name foil looked premium and packaging was gift-ready. Will reorder.', 'Chennai', 'approved'),
  ('Sneha P.', 4, 'Beautiful minimal design. Lay-flat binding makes journaling a joy. Shipping was quick across India.', 'Pune', 'approved'),
  ('Devika S.', 5, 'Suvadu nails the aesthetic. The Calm Collection sits perfectly on my desk and writing in it feels special.', 'Kochi', 'approved')
on conflict do nothing;

-- FAQs (§7.5 — 5 categories)
insert into public.faqs (category, question, answer, sort_order) values
  ('Shipping', 'Where do you ship?', 'We ship pan-India via Shiprocket. Most metros receive orders in 2–4 business days; other locations in 4–7 days.', 0),
  ('Shipping', 'How much does shipping cost?', 'Shipping is calculated at checkout based on your pincode. Orders above a set value ship free — the threshold is shown in your cart.', 1),
  ('Shipping', 'Can I track my order?', 'Yes. Once shipped you’ll receive a tracking link by SMS and email, and you can track it under My Account → Order History.', 2),
  ('Customization', 'What can I personalise?', 'On Customized Notebooks you can add a name or short text, choose a font, and pick a cover colour. Live preview updates as you edit.', 0),
  ('Customization', 'Is there a price difference for custom sizes?', 'Custom sizes on the Customized Notebook are priced on request. A5 and A4 prices are shown on the product page.', 1),
  ('Customization', 'Can I see a proof before printing?', 'For complex custom designs (Create & Carry) we share a digital proof for approval before production.', 2),
  ('Returns', 'What is your return window?', 'Non-personalised products can be returned within 7 days of delivery if unused and in original packaging. See our Return & Refund Policy.', 0),
  ('Returns', 'Are personalised notebooks returnable?', 'Personalised items are made-to-order and can’t be returned unless they arrive damaged or defective.', 1),
  ('Returns', 'How are refunds processed?', 'Approved refunds are credited to your original payment method within 5–7 business days.', 2),
  ('Payments', 'Which payment methods do you accept?', 'We accept UPI, Debit Card, Credit Card and Net Banking via Razorpay — a PCI-compliant, secure gateway.', 0),
  ('Payments', 'Is my payment secure?', 'Yes. Payments are processed over HTTPS through Razorpay. We never store your full card details.', 1),
  ('Payments', 'Do you accept Cash on Delivery?', 'Currently we accept prepaid orders only to keep prices and quality consistent.', 2),
  ('Orders', 'Can I modify or cancel my order?', 'You can cancel before dispatch from My Account → Order History. Personalised orders can’t be modified once production starts.', 0),
  ('Orders', 'Do I need an account to order?', 'You can browse and add to cart freely. An account is required to save a wishlist, customizations and view order history.', 1),
  ('Orders', 'I have a coupon — where do I apply it?', 'Enter your coupon in the Cart page’s “Apply Coupon” field. Valid codes apply the discount to your total instantly.', 2)
on conflict do nothing;
