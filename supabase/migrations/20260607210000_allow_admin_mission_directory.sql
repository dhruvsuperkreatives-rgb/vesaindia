create or replace function public.get_mission_people()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  caller public.profiles%rowtype;
  caller_approved boolean;
  caller_is_admin boolean := false;
begin
  select * into caller
  from public.profiles
  where id = auth.uid();

  caller_is_admin := coalesce(caller.role = 'admin', false);

  if caller.id is null or caller.status = 'inactive' then
    return '[]'::jsonb;
  end if;

  if not caller_is_admin then
    if caller.organization_registration_id is null or caller.status <> 'active' then
      return '[]'::jsonb;
    end if;

    select status = 'approved' into caller_approved
    from public.organization_registrations
    where id = caller.organization_registration_id;

    if not coalesce(caller_approved, false) then
      return '[]'::jsonb;
    end if;
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
        'organization_id', organization.id,
        'organization_code', organization.organization_code,
        'organization_name', organization.organization_name,
        'department_id', department.id,
        'department_code', department.department_code,
        'department_name', department.department_name,
        'nodal_profile_id', department.nodal_profile_id,
        'nodal_name', nullif(trim(concat_ws(
          ' ',
          nodal.first_name,
          nodal.middle_name,
          nodal.last_name
        )), '')
      )
      order by
        organization.organization_code,
        department.department_code nulls first,
        case profile.role
          when 'org_head' then 0
          when 'nodal_officer' then 1
          else 2
        end,
        profile.member_code
    )
    from public.profiles profile
    join public.organization_registrations organization
      on organization.id = profile.organization_registration_id
      and organization.status = 'approved'
    left join public.org_departments department
      on department.id = profile.department_id
    left join public.profiles nodal
      on nodal.id = department.nodal_profile_id
    where profile.role in ('org_head', 'nodal_officer', 'employee')
      and profile.status = 'active'
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_mission_people() from public, anon;
grant execute on function public.get_mission_people() to authenticated;
