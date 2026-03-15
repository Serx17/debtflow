-- Table for storing pre-collection scores per debtor (Scorer module).
create table if not exists debtor_scores (
  id uuid primary key default gen_random_uuid(),
  debtor_id uuid not null references debtors(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  score numeric(5,4) not null,
  segment text not null,
  recommended_channel text not null check (recommended_channel in ('sms', 'email', 'call')),
  computed_at timestamptz not null default now(),
  unique(debtor_id)
);

create index if not exists idx_debtor_scores_organization_id on debtor_scores (organization_id);
create index if not exists idx_debtor_scores_segment on debtor_scores (segment);
