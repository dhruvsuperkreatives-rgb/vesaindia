alter table public.organization_registrations
add column if not exists organization_code text;

alter table public.org_departments
add column if not exists department_code text;

alter table public.profiles
add column if not exists member_code text,
add column if not exists verification_code text;

do $$
begin
  if (select count(*) from public.organization_registrations) > 999 then
    raise exception 'Verification codes support at most 999 organizations.';
  end if;
end;
$$;

with ranked as (
  select id, lpad(row_number() over (order by created_at, id)::text, 3, '0') as code
  from public.organization_registrations
)
update public.organization_registrations org
set organization_code = ranked.code
from ranked
where org.id = ranked.id and org.organization_code is null;

do $$
begin
  if exists (
    select 1 from public.org_departments
    group by organization_registration_id
    having count(*) > 999
  ) then
    raise exception 'Verification codes support at most 999 departments per organization.';
  end if;
end;
$$;

with ranked as (
  select
    id,
    lpad(
      row_number() over (
        partition by organization_registration_id
        order by created_at, id
      )::text,
      3,
      '0'
    ) as code
  from public.org_departments
)
update public.org_departments department
set department_code = ranked.code
from ranked
where department.id = ranked.id and department.department_code is null;

do $$
begin
  if exists (
    select 1 from public.profiles
    where role in ('org_head', 'nodal_officer', 'employee')
      and organization_registration_id is not null
    group by organization_registration_id, department_id
    having count(*) > 999
  ) then
    raise exception 'Verification codes support at most 999 people per department.';
  end if;
end;
$$;

with ranked as (
  select
    id,
    lpad(
      row_number() over (
        partition by organization_registration_id, department_id
        order by
          case role
            when 'org_head' then 0
            when 'nodal_officer' then 1
            else 2
          end,
          id
      )::text,
      3,
      '0'
    ) as code
  from public.profiles
  where role in ('org_head', 'nodal_officer', 'employee')
    and organization_registration_id is not null
)
update public.profiles profile
set member_code = ranked.code
from ranked
where profile.id = ranked.id and profile.member_code is null;

update public.profiles profile
set verification_code =
  org.organization_code
  || coalesce(department.department_code, '000')
  || case when profile.wants_volunteer then 'V' else '0' end
  || profile.member_code
from public.organization_registrations org
left join public.org_departments department on department.id = profile.department_id
where profile.organization_registration_id = org.id
  and profile.role in ('org_head', 'nodal_officer', 'employee');

alter table public.organization_registrations
alter column organization_code set not null;

alter table public.org_departments
alter column department_code set not null;

alter table public.organization_registrations
add constraint organization_registrations_organization_code_check
check (organization_code ~ '^[0-9]{3}$' and organization_code <> '000');

alter table public.org_departments
add constraint org_departments_department_code_check
check (department_code ~ '^[0-9]{3}$' and department_code <> '000');

alter table public.profiles
add constraint profiles_member_code_check
check (member_code is null or (member_code ~ '^[0-9]{3}$' and member_code <> '000'));

alter table public.profiles
add constraint profiles_verification_code_check
check (verification_code is null or verification_code ~ '^[0-9]{6}[V0][0-9]{3}$');

alter table public.profiles
add constraint profiles_mission_code_required_check
check (
  role not in ('org_head', 'nodal_officer', 'employee')
  or (
    organization_registration_id is null
    and department_id is null
    and member_code is null
    and verification_code is null
  )
  or (
    organization_registration_id is not null
    and member_code is not null
    and verification_code is not null
    and (
      (role = 'org_head' and department_id is null)
      or (role in ('nodal_officer', 'employee') and department_id is not null)
    )
  )
);

create unique index organization_registrations_organization_code_key
on public.organization_registrations (organization_code);

create unique index org_departments_org_department_code_key
on public.org_departments (organization_registration_id, department_code);

create unique index profiles_scope_member_code_key
on public.profiles (
  organization_registration_id,
  coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
  member_code
)
where member_code is not null;

create unique index profiles_verification_code_key
on public.profiles (verification_code)
where verification_code is not null;

create or replace function private.assign_organization_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_code integer;
begin
  if tg_op = 'UPDATE' then
    new.organization_code := old.organization_code;
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('vesa:organization-code', 0));

  select coalesce(max(organization_code::integer), 0) + 1
  into next_code
  from public.organization_registrations;

  if next_code > 999 then
    raise exception 'No organization verification codes remain.';
  end if;

  new.organization_code := lpad(next_code::text, 3, '0');
  return new;
end;
$$;

create or replace function private.assign_department_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_code integer;
begin
  if tg_op = 'UPDATE' then
    if new.organization_registration_id <> old.organization_registration_id
      and exists (
        select 1
        from public.profiles
        where department_id = old.id
      ) then
      raise exception 'A department with assigned members cannot move to another organization.';
    end if;

    if new.organization_registration_id = old.organization_registration_id then
      new.department_code := old.department_code;
      return new;
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('vesa:department-code:' || new.organization_registration_id::text, 0)
  );

  select coalesce(max(department_code::integer), 0) + 1
  into next_code
  from public.org_departments
  where organization_registration_id = new.organization_registration_id
    and (tg_op = 'INSERT' or id <> new.id);

  if next_code > 999 then
    raise exception 'No department verification codes remain for this organization.';
  end if;

  new.department_code := lpad(next_code::text, 3, '0');
  return new;
end;
$$;

create or replace function private.assign_member_verification_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  org_code text;
  dept_code text;
  next_code integer;
  scope_changed boolean;
begin
  if new.role not in ('org_head', 'nodal_officer', 'employee') then
    new.member_code := null;
    new.verification_code := null;
    return new;
  end if;

  if new.organization_registration_id is null then
    if new.department_id is not null then
      raise exception 'An unattached mission member cannot belong to a department.';
    end if;
    new.member_code := null;
    new.verification_code := null;
    return new;
  end if;

  select organization_code into org_code
  from public.organization_registrations
  where id = new.organization_registration_id;

  if org_code is null then
    raise exception 'Organization verification code was not found.';
  end if;

  if new.department_id is null then
    if new.role <> 'org_head' then
      raise exception 'Nodal officers and employees must belong to a department.';
    end if;
    dept_code := '000';
  else
    select department_code into dept_code
    from public.org_departments
    where id = new.department_id
      and organization_registration_id = new.organization_registration_id;

    if dept_code is null then
      raise exception 'Department does not belong to the selected organization.';
    end if;
  end if;

  scope_changed := tg_op = 'INSERT'
    or new.organization_registration_id is distinct from old.organization_registration_id
    or new.department_id is distinct from old.department_id;

  if scope_changed or new.member_code is null then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'vesa:member-code:'
        || new.organization_registration_id::text
        || ':'
        || coalesce(new.department_id::text, 'organization-head'),
        0
      )
    );

    select coalesce(max(member_code::integer), 0) + 1
    into next_code
    from public.profiles
    where organization_registration_id = new.organization_registration_id
      and department_id is not distinct from new.department_id
      and role in ('org_head', 'nodal_officer', 'employee')
      and (tg_op = 'INSERT' or id <> new.id);

    if next_code > 999 then
      raise exception 'No member verification codes remain for this department.';
    end if;

    new.member_code := lpad(next_code::text, 3, '0');
  elsif tg_op = 'UPDATE' then
    new.member_code := old.member_code;
  end if;

  new.verification_code :=
    org_code
    || dept_code
    || case when new.wants_volunteer then 'V' else '0' end
    || new.member_code;

  return new;
end;
$$;

create trigger assign_organization_code
before insert or update of organization_code
on public.organization_registrations
for each row execute function private.assign_organization_code();

create trigger assign_department_code
before insert or update of organization_registration_id, department_code
on public.org_departments
for each row execute function private.assign_department_code();

create trigger assign_member_verification_code
before insert or update of
  role,
  organization_registration_id,
  department_id,
  wants_volunteer,
  member_code,
  verification_code
on public.profiles
for each row execute function private.assign_member_verification_code();

create or replace function public.get_mission_people()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  caller public.profiles%rowtype;
  approved boolean;
begin
  select * into caller
  from public.profiles
  where id = auth.uid();

  if caller.id is null or caller.organization_registration_id is null then
    return '[]'::jsonb;
  end if;

  select status = 'approved' into approved
  from public.organization_registrations
  where id = caller.organization_registration_id;

  if not coalesce(approved, false) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', profile.id,
        'first_name', profile.first_name,
        'middle_name', profile.middle_name,
        'last_name', profile.last_name,
        'role', profile.role,
        'status', profile.status,
        'office_location', profile.office_location,
        'social_media_handle', profile.social_media_handle,
        'photograph_url', profile.photograph_url,
        'wants_volunteer', profile.wants_volunteer,
        'member_code', profile.member_code,
        'verification_code', profile.verification_code,
        'department_id', profile.department_id,
        'department_code', department.department_code,
        'department_name', department.department_name
      )
      order by
        case profile.role
          when 'org_head' then 0
          when 'nodal_officer' then 1
          else 2
        end,
        department.department_code nulls first,
        profile.member_code
    )
    from public.profiles profile
    left join public.org_departments department on department.id = profile.department_id
    where profile.organization_registration_id = caller.organization_registration_id
      and profile.role in ('org_head', 'nodal_officer', 'employee')
      and profile.status = 'active'
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_mission_people() from public, anon;
grant execute on function public.get_mission_people() to authenticated;

revoke execute on function private.assign_organization_code() from public, anon, authenticated;
revoke execute on function private.assign_department_code() from public, anon, authenticated;
revoke execute on function private.assign_member_verification_code() from public, anon, authenticated;
