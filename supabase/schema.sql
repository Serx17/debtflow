-- Supabase schema for DebtFlow MVP

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Demo organization for MVP and seed data
insert into organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'DebtFlow Demo Organization')
on conflict (id) do nothing;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create index if not exists idx_users_organization_id on users (organization_id);

create table if not exists debtors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  debt_amount numeric(14,2) not null default 0,
  region text,
  created_at timestamptz not null default now()
);

create index if not exists idx_debtors_organization_id on debtors (organization_id);
create index if not exists idx_debtors_region on debtors (region);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('sms', 'email', 'call')),
  subject text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_templates_organization_id on templates (organization_id);
create index if not exists idx_templates_channel on templates (channel);

create table if not exists channel_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  sms_enabled boolean not null default false,
  sms_cost numeric(10,4),
  email_enabled boolean not null default false,
  email_cost numeric(10,4),
  call_enabled boolean not null default false,
  call_cost_per_minute numeric(10,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists communication_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  debtor_id uuid not null references debtors(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email', 'call')),
  template_id uuid references templates(id) on delete set null,
  status text not null check (status in ('pending', 'sent', 'failed')),
  cost numeric(10,4),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_communication_log_organization_id on communication_log (organization_id);
create index if not exists idx_communication_log_debtor_id on communication_log (debtor_id);
create index if not exists idx_communication_log_sent_at on communication_log (sent_at);
create index if not exists idx_communication_log_status on communication_log (status);

