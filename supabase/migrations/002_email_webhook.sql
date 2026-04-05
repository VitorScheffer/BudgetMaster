-- ─── CARD LAST FOUR ON ACCOUNTS ──────────────────────────────────────────────
alter table accounts
  add column card_last_four varchar(4);

create index accounts_user_card on accounts(user_id, card_last_four)
  where card_last_four is not null;

-- ─── WEBHOOK TOKENS ───────────────────────────────────────────────────────────
create table webhook_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null unique,
  label       text,
  created_at  timestamptz not null default now()
);

alter table webhook_tokens enable row level security;

create policy "webhook_tokens: owner only"
  on webhook_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
