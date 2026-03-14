-- Enable Row Level Security

alter table organizations enable row level security;
alter table users enable row level security;
alter table debtors enable row level security;
alter table templates enable row level security;
alter table channel_settings enable row level security;
alter table communication_log enable row level security;

-- Helper: users связаны с auth.users по id

create policy "Users can see their own profile"
on users
for select
using (id = auth.uid());

create policy "Users can update their own profile"
on users
for update
using (id = auth.uid());

-- Политики для данных, изолированных по organization_id

create policy "Org members can select organization"
on organizations
for select
using (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = organizations.id
  )
);

create policy "Org members can select debtors"
on debtors
for select
using (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = debtors.organization_id
  )
);

create policy "Org members can insert debtors"
on debtors
for insert
with check (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = organization_id
  )
);

create policy "Org members can update debtors"
on debtors
for update
using (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = debtors.organization_id
  )
)
with check (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = organization_id
  )
);

create policy "Org members can select templates"
on templates
for select
using (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = templates.organization_id
  )
);

create policy "Org members can insert templates"
on templates
for insert
with check (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = organization_id
  )
);

create policy "Org members can update templates"
on templates
for update
using (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = templates.organization_id
  )
)
with check (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = organization_id
  )
);

create policy "Org members can manage channel settings"
on channel_settings
for all
using (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = channel_settings.organization_id
  )
)
with check (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = organization_id
  )
);

create policy "Org members can select communication log"
on communication_log
for select
using (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = communication_log.organization_id
  )
);

create policy "Org members can insert communication log"
on communication_log
for insert
with check (
  exists (
    select 1
    from users u
    where u.id = auth.uid()
      and u.organization_id = organization_id
  )
);

