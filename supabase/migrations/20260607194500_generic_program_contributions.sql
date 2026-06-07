create table if not exists public.program_contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  organization_registration_id uuid not null
    references public.organization_registrations(id) on delete cascade,
  program_id uuid not null references public.mission_programs(id) on delete restrict,
  department_id uuid references public.org_departments(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  quantity integer not null,
  notes text,
  status text not null default 'submitted'
    check (status in ('submitted', 'verified', 'rejected'))
);

drop trigger if exists set_program_contributions_updated_at on public.program_contributions;
create trigger set_program_contributions_updated_at
before update on public.program_contributions
for each row execute function public.set_updated_at();

create or replace function private.enforce_generic_program_rules()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  program public.mission_programs%rowtype;
begin
  select * into program from public.mission_programs where id = new.program_id;
  if program.id is null or not program.is_active then
    raise exception 'This contribution program is currently disabled';
  end if;
  if new.quantity < program.minimum_quantity then
    raise exception 'Minimum % contribution is %', program.name, program.minimum_quantity;
  end if;
  if not exists (
    select 1 from public.organization_programs selection
    where selection.organization_registration_id = new.organization_registration_id
      and selection.program_id = new.program_id
  ) then
    raise exception 'This organisation is not registered for %', program.name;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_generic_program_rules on public.program_contributions;
create trigger enforce_generic_program_rules
before insert or update of quantity, program_id, organization_registration_id
on public.program_contributions
for each row execute function private.enforce_generic_program_rules();

alter table public.program_contributions enable row level security;

create policy "Approved members can insert program contributions"
on public.program_contributions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and organization_registration_id = private.profile_org_id((select auth.uid()))
  and private.profile_status((select auth.uid())) = 'active'
  and private.is_org_approved(organization_registration_id)
  and (
    private.profile_role((select auth.uid())) = 'org_head'
    or department_id = private.profile_department_id((select auth.uid()))
  )
);

create policy "Permitted users can view program contributions"
on public.program_contributions
for select
to authenticated
using (
  private.is_admin((select auth.uid()))
  or user_id = (select auth.uid())
  or (
    private.profile_role((select auth.uid())) = 'org_head'
    and organization_registration_id = private.profile_org_id((select auth.uid()))
    and private.is_org_approved(organization_registration_id)
  )
  or (
    private.profile_role((select auth.uid())) = 'nodal_officer'
    and department_id = private.profile_department_id((select auth.uid()))
    and private.is_org_approved(organization_registration_id)
  )
);

create policy "Users can update own submitted program contributions"
on public.program_contributions
for update
to authenticated
using (user_id = (select auth.uid()) and status = 'submitted')
with check (user_id = (select auth.uid()) and status = 'submitted');

create policy "Admins can delete program contributions"
on public.program_contributions
for delete
to authenticated
using (private.is_admin((select auth.uid())));

grant select, insert, update, delete on public.program_contributions to authenticated;
revoke execute on function private.enforce_generic_program_rules() from public, anon, authenticated;

create index if not exists program_contributions_org_idx
on public.program_contributions (organization_registration_id);
create index if not exists program_contributions_program_idx
on public.program_contributions (program_id);
create index if not exists program_contributions_user_idx
on public.program_contributions (user_id);
create index if not exists program_contributions_department_idx
on public.program_contributions (department_id);
