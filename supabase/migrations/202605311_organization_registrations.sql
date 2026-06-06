create table if not exists public.organization_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  organization_name text not null,
  registration_type text not null check (
    registration_type in (
      'government_state',
      'government_central',
      'corporate',
      'educational',
      'ngo_civil_group',
      'other'
    )
  ),
  core_work_location text not null,
  implementation_scope text not null check (
    implementation_scope in ('single_office', 'state_wide_mh', 'pan_india')
  ),
  participating_locations integer not null check (participating_locations > 0),
  initial_launch_locations text not null,
  estimated_participants integer not null check (estimated_participants > 0),
  target_nwpp_bags integer generated always as (estimated_participants * 10) stored,
  primary_departments text,
  nodal_officer_name text not null,
  nodal_designation text not null,
  nodal_mobile text not null,
  nodal_email text not null,
  accepts_commitments boolean not null default false,
  notes text,
  source text not null default 'website'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_organization_registrations_updated_at
on public.organization_registrations;

create trigger set_organization_registrations_updated_at
before update on public.organization_registrations
for each row execute function public.set_updated_at();

alter table public.organization_registrations enable row level security;

drop policy if exists "Anyone can submit organisation registrations"
on public.organization_registrations;

drop policy if exists "Admins can view organisation registrations"
on public.organization_registrations;

drop policy if exists "Admins can update organisation registrations"
on public.organization_registrations;

drop policy if exists "Admins can delete organisation registrations"
on public.organization_registrations;

create policy "Anyone can submit organisation registrations"
on public.organization_registrations
for insert
to anon, authenticated
with check (true);

create policy "Admins can view organisation registrations"
on public.organization_registrations
for select
to authenticated
using (public.is_admin());

create policy "Admins can update organisation registrations"
on public.organization_registrations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete organisation registrations"
on public.organization_registrations
for delete
to authenticated
using (public.is_admin());

grant insert on public.organization_registrations to anon, authenticated;
grant select, update, delete on public.organization_registrations to authenticated;

create index if not exists organization_registrations_status_idx
on public.organization_registrations(status);

create index if not exists organization_registrations_created_at_idx
on public.organization_registrations(created_at desc);

alter table public.organization_registrations
add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists organization_registrations_owner_id_idx
on public.organization_registrations(owner_id);

create table if not exists public.nwpp_contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  organization_registration_id uuid not null references public.organization_registrations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  bags_count integer not null check (bags_count >= 10),
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'verified', 'rejected')),
  estimated_sup_bags_avoided integer generated always as (bags_count * 1) stored
);

create unique index if not exists nwpp_contributions_org_user_idx
on public.nwpp_contributions(organization_registration_id, user_id);

create index if not exists nwpp_contributions_user_id_idx
on public.nwpp_contributions(user_id);

create index if not exists nwpp_contributions_created_at_idx
on public.nwpp_contributions(created_at desc);

drop trigger if exists set_nwpp_contributions_updated_at
on public.nwpp_contributions;

create trigger set_nwpp_contributions_updated_at
before update on public.nwpp_contributions
for each row execute function public.set_updated_at();

alter table public.nwpp_contributions enable row level security;

drop policy if exists "Anyone can submit organisation registrations"
on public.organization_registrations;

drop policy if exists "Authenticated users can submit their organisation"
on public.organization_registrations;

drop policy if exists "Organisation owners can view own registration"
on public.organization_registrations;

drop policy if exists "Organisation owners can update own pending registration"
on public.organization_registrations;

create policy "Authenticated users can submit their organisation"
on public.organization_registrations
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Organisation owners can view own registration"
on public.organization_registrations
for select
to authenticated
using (owner_id = auth.uid());

create policy "Organisation owners can update own pending registration"
on public.organization_registrations
for update
to authenticated
using (owner_id = auth.uid() and status = 'pending')
with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists "Users can insert own NWPP contribution"
on public.nwpp_contributions;

drop policy if exists "Users can view own NWPP contribution"
on public.nwpp_contributions;

drop policy if exists "Users can update own submitted NWPP contribution"
on public.nwpp_contributions;

drop policy if exists "Admins can view NWPP contributions"
on public.nwpp_contributions;

drop policy if exists "Admins can update NWPP contributions"
on public.nwpp_contributions;

drop policy if exists "Admins can delete NWPP contributions"
on public.nwpp_contributions;

create policy "Users can insert own NWPP contribution"
on public.nwpp_contributions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.organization_registrations org
    where org.id = organization_registration_id
      and org.owner_id = auth.uid()
  )
);

create policy "Users can view own NWPP contribution"
on public.nwpp_contributions
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update own submitted NWPP contribution"
on public.nwpp_contributions
for update
to authenticated
using (user_id = auth.uid() and status = 'submitted')
with check (user_id = auth.uid() and status = 'submitted');

create policy "Admins can view NWPP contributions"
on public.nwpp_contributions
for select
to authenticated
using (public.is_admin());

create policy "Admins can update NWPP contributions"
on public.nwpp_contributions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete NWPP contributions"
on public.nwpp_contributions
for delete
to authenticated
using (public.is_admin());

grant select, insert, update on public.organization_registrations to authenticated;
grant select, insert, update, delete on public.nwpp_contributions to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, role)
    values (new.id, 'guest');
    return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    );
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
