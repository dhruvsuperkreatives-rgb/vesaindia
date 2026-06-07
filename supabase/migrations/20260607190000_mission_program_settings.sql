create table if not exists public.mission_programs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  description text,
  is_active boolean not null default true,
  show_on_registration boolean not null default true,
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  unit_label text not null default 'items' check (length(trim(unit_label)) > 0),
  target_per_participant numeric(10, 2) not null default 0 check (target_per_participant >= 0),
  utility_bag_available boolean not null default false,
  utility_bag_fee numeric(10, 2) not null default 0 check (utility_bag_fee >= 0),
  sort_order integer not null default 0
);

insert into public.mission_programs (
  slug, name, description, minimum_quantity, unit_label,
  target_per_participant, utility_bag_available, utility_bag_fee, sort_order
)
values
  ('nwpp_bag', 'NWPP Bags', 'Contribute reusable non-woven polypropylene bags.', 10, 'bags', 10, false, 0, 10),
  ('garment', 'Garments', 'Donate garments for reuse or utility-bag upcycling.', 1, 'garments', 0, true, 0, 20)
on conflict (slug) do nothing;

create table if not exists public.organization_programs (
  organization_registration_id uuid not null
    references public.organization_registrations(id) on delete cascade,
  program_id uuid not null references public.mission_programs(id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (organization_registration_id, program_id)
);

insert into public.organization_programs (organization_registration_id, program_id)
select org.id, program.id
from public.organization_registrations org
cross join public.mission_programs program
where program.slug in ('nwpp_bag', 'garment')
on conflict do nothing;

drop trigger if exists set_mission_programs_updated_at on public.mission_programs;
create trigger set_mission_programs_updated_at
before update on public.mission_programs
for each row execute function public.set_updated_at();

alter table public.mission_programs enable row level security;
alter table public.organization_programs enable row level security;

create policy "Public can view available mission programs"
on public.mission_programs for select to anon
using (is_active and show_on_registration);

create policy "Authenticated users can view active mission programs"
on public.mission_programs for select to authenticated
using (is_active or private.is_admin((select auth.uid())));

create policy "Admins can insert mission programs"
on public.mission_programs for insert to authenticated
with check (private.is_admin((select auth.uid())));

create policy "Admins can update mission programs"
on public.mission_programs for update to authenticated
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

create policy "Admins can delete mission programs"
on public.mission_programs for delete to authenticated
using (private.is_admin((select auth.uid())));

create policy "Permitted users can view organisation programs"
on public.organization_programs for select to authenticated
using (
  private.is_admin((select auth.uid()))
  or organization_registration_id = private.profile_org_id((select auth.uid()))
  or exists (
    select 1 from public.organization_registrations org
    where org.id = organization_registration_id
      and org.owner_id = (select auth.uid())
  )
);

create policy "Organisation owners can select programs"
on public.organization_programs for insert to authenticated
with check (
  private.is_admin((select auth.uid()))
  or exists (
    select 1 from public.organization_registrations org
    where org.id = organization_registration_id
      and org.owner_id = (select auth.uid())
      and org.status = 'pending'
  )
);

create policy "Admins can update organisation programs"
on public.organization_programs for update to authenticated
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

create policy "Admins can delete organisation programs"
on public.organization_programs for delete to authenticated
using (private.is_admin((select auth.uid())));

grant select on public.mission_programs to anon, authenticated;
grant insert, update, delete on public.mission_programs to authenticated;
grant select, insert, update, delete on public.organization_programs to authenticated;

alter table public.nwpp_contributions
drop constraint if exists nwpp_contributions_bags_count_check;

alter table public.garment_contributions
drop constraint if exists garment_contributions_garment_count_check;

create or replace function private.enforce_nwpp_program_rules()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  program public.mission_programs%rowtype;
begin
  select * into program from public.mission_programs where slug = 'nwpp_bag';
  if program.id is null or not program.is_active then
    raise exception 'NWPP bag contributions are currently disabled';
  end if;
  if new.bags_count < program.minimum_quantity then
    raise exception 'Minimum NWPP bag contribution is %', program.minimum_quantity;
  end if;
  if not exists (
    select 1 from public.organization_programs selection
    where selection.organization_registration_id = new.organization_registration_id
      and selection.program_id = program.id
  ) then
    raise exception 'This organisation is not registered for NWPP bags';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_garment_program_rules()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  program public.mission_programs%rowtype;
begin
  select * into program from public.mission_programs where slug = 'garment';
  if program.id is null or not program.is_active then
    raise exception 'Garment contributions are currently disabled';
  end if;
  if new.garment_count < program.minimum_quantity then
    raise exception 'Minimum garment contribution is %', program.minimum_quantity;
  end if;
  if not exists (
    select 1 from public.organization_programs selection
    where selection.organization_registration_id = new.organization_registration_id
      and selection.program_id = program.id
  ) then
    raise exception 'This organisation is not registered for garments';
  end if;
  if new.wants_utility_bag and not program.utility_bag_available then
    raise exception 'Utility bags are currently unavailable';
  end if;
  if new.wants_utility_bag then
    new.labour_fee := program.utility_bag_fee;
    if tg_op = 'INSERT' then new.payment_status := 'pending'; end if;
  else
    new.labour_fee := 0;
    new.payment_status := 'not_required';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_nwpp_program_rules on public.nwpp_contributions;
create trigger enforce_nwpp_program_rules
before insert or update of bags_count, organization_registration_id
on public.nwpp_contributions
for each row execute function private.enforce_nwpp_program_rules();

drop trigger if exists enforce_garment_program_rules on public.garment_contributions;
create trigger enforce_garment_program_rules
before insert or update of garment_count, wants_utility_bag, organization_registration_id
on public.garment_contributions
for each row execute function private.enforce_garment_program_rules();

revoke execute on function private.enforce_nwpp_program_rules() from public, anon, authenticated;
revoke execute on function private.enforce_garment_program_rules() from public, anon, authenticated;

create index if not exists mission_programs_registration_idx
on public.mission_programs (is_active, show_on_registration, sort_order);

create index if not exists organization_programs_program_idx
on public.organization_programs (program_id);

alter table public.organization_registrations
alter column target_nwpp_bags drop expression;

create or replace function private.set_organisation_nwpp_target()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  target_rate numeric(10, 2);
begin
  select target_per_participant into target_rate
  from public.mission_programs
  where slug = 'nwpp_bag';
  new.target_nwpp_bags := round(new.estimated_participants * coalesce(target_rate, 0));
  return new;
end;
$$;

create or replace function private.refresh_organisation_nwpp_targets()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.slug = 'nwpp_bag' and new.target_per_participant is distinct from old.target_per_participant then
    update public.organization_registrations
    set target_nwpp_bags = round(estimated_participants * new.target_per_participant);
  end if;
  return new;
end;
$$;

drop trigger if exists set_organisation_nwpp_target on public.organization_registrations;
create trigger set_organisation_nwpp_target
before insert or update of estimated_participants
on public.organization_registrations
for each row execute function private.set_organisation_nwpp_target();

drop trigger if exists refresh_organisation_nwpp_targets on public.mission_programs;
create trigger refresh_organisation_nwpp_targets
after update of target_per_participant
on public.mission_programs
for each row execute function private.refresh_organisation_nwpp_targets();

revoke execute on function private.set_organisation_nwpp_target() from public, anon, authenticated;
revoke execute on function private.refresh_organisation_nwpp_targets() from public, anon, authenticated;
