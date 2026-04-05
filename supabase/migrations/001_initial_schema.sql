-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────
create type account_type as enum ('checking', 'savings', 'credit_card');
create type currency_code as enum ('USD', 'KYD');

-- ─── ACCOUNTS ────────────────────────────────────────────────────────────────
create table accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        account_type not null,
  currency    currency_code not null default 'USD',
  created_at  timestamptz not null default now()
);

alter table accounts enable row level security;

create policy "accounts: owner only"
  on accounts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
create table categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default '#6b7280',
  icon        text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table categories enable row level security;

create policy "categories: owner only"
  on categories for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── CATEGORY RULES ──────────────────────────────────────────────────────────
create table category_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category_id  uuid not null references categories(id) on delete cascade,
  keyword      text not null,
  created_at   timestamptz not null default now()
);

alter table category_rules enable row level security;

create policy "category_rules: owner only"
  on category_rules for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
create table transactions (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  post_date        date,
  description      text not null,
  amount           numeric(14, 2) not null,  -- negative = expense, positive = income
  cheque_number    text,
  card_number      text,
  running_balance  numeric(14, 2),
  import_hash      text not null,
  category_id      uuid references categories(id) on delete set null,
  transfer_id      uuid references transactions(id) on delete set null,
  is_transfer      boolean not null default false,
  is_pending       boolean not null default false,
  created_at       timestamptz not null default now(),
  constraint transactions_import_hash_user unique (user_id, import_hash)
);

create index transactions_user_account_date on transactions(user_id, account_id, date desc);
create index transactions_user_date on transactions(user_id, date desc);
create index transactions_transfer_id on transactions(transfer_id);

alter table transactions enable row level security;

create policy "transactions: owner only"
  on transactions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── IMPORT LOGS ─────────────────────────────────────────────────────────────
create table import_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  account_id     uuid not null references accounts(id) on delete cascade,
  filename       text not null,
  rows_imported  integer not null default 0,
  rows_skipped   integer not null default 0,
  imported_at    timestamptz not null default now()
);

alter table import_logs enable row level security;

create policy "import_logs: owner only"
  on import_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── DEFAULT CATEGORIES (seeded via trigger on first sign-in) ─────────────────
create or replace function seed_default_categories()
returns trigger language plpgsql security definer as $$
begin
  insert into categories (user_id, name, color, icon, is_default) values
    (new.id, 'Food & Dining',     '#f97316', null,  true),
    (new.id, 'Transport',         '#3b82f6', null,  true),
    (new.id, 'Housing',           '#8b5cf6', null,  true),
    (new.id, 'Utilities',         '#06b6d4', null,  true),
    (new.id, 'Entertainment',     '#ec4899', null,  true),
    (new.id, 'Health',            '#10b981', null,  true),
    (new.id, 'Shopping',          '#f59e0b', null,  true),
    (new.id, 'Software & Tech',   '#6366f1', null,  true),
    (new.id, 'Travel',            '#14b8a6', null,  true),
    (new.id, 'Income',            '#22c55e', null,  true),
    (new.id, 'Transfer',          '#94a3b8', null,  true),
    (new.id, 'Other',             '#6b7280', null,  true);

  -- default category rules
  insert into category_rules (user_id, category_id, keyword)
  select new.id, c.id, rules.keyword from (
    values
      ('Food & Dining',   'UBER *EATS'),
      ('Food & Dining',   'DOORDASH'),
      ('Food & Dining',   'KIRK MARKET'),
      ('Food & Dining',   'FOSTER'),
      ('Food & Dining',   'GREEN MACHINE'),
      ('Food & Dining',   'COST U LESS'),
      ('Transport',       'UBER *TRIP'),
      ('Transport',       'UBER*RIDES'),
      ('Transport',       'DL *UBER'),
      ('Software & Tech', 'ANTHROPIC'),
      ('Software & Tech', 'OPENAI'),
      ('Software & Tech', 'CHATGPT'),
      ('Software & Tech', 'SLACK'),
      ('Software & Tech', 'ZOHO'),
      ('Software & Tech', 'GODADDY'),
      ('Utilities',       'WATER AUTHORITY'),
      ('Income',          'PAYROLL'),
      ('Transfer',        'WISE'),
      ('Transfer',        'CIBC FCIB CREDIT CARD')
  ) as rules(cat_name, keyword)
  join categories c on c.user_id = new.id and c.name = rules.cat_name;

  return new;
exception when others then
  -- Never block user creation if seeding fails
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function seed_default_categories();
