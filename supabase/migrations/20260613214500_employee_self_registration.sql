create or replace function public.complete_employee_self_registration(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_gender text,
  p_age integer,
  p_mobile_number text,
  p_office_location text,
  p_wants_volunteer boolean,
  p_social_media_handle text,
  p_photograph_url text,
  p_organization_id uuid,
  p_department_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  v_user_role text;
  v_office_location text;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_user_role
  from public.profiles
  where id = current_user_id;

  if v_user_role <> 'guest' then
    raise exception 'Only guest profiles can complete employee self-registration.';
  end if;

  -- Validate organization and department
  if not exists (
    select 1
    from public.organization_registrations
    where id = p_organization_id and status = 'approved'
  ) then
    raise exception 'Invalid or unapproved organization.';
  end if;

  -- Get department office location if p_office_location is empty or null
  if p_office_location is null or trim(p_office_location) = '' then
    select office_location into v_office_location
    from public.org_departments
    where id = p_department_id and organization_registration_id = p_organization_id;

    if v_office_location is null then
      raise exception 'Department does not belong to the organization or office location is missing.';
    end if;
  else
    v_office_location := trim(p_office_location);
  end if;

  -- Update profile
  update public.profiles
  set
    role = 'employee',
    status = 'pending', -- Wait for Nodal Officer approval!
    first_name = p_first_name,
    middle_name = p_middle_name,
    last_name = p_last_name,
    gender = p_gender,
    age = p_age,
    mobile_number = p_mobile_number,
    residential_address = null,
    office_location = v_office_location,
    wants_volunteer = p_wants_volunteer,
    social_media_handle = p_social_media_handle,
    photograph_url = p_photograph_url,
    organization_registration_id = p_organization_id,
    department_id = p_department_id
  where id = current_user_id;
end;
$$;

revoke all on function public.complete_employee_self_registration(text, text, text, text, integer, text, text, boolean, text, text, uuid, uuid) from public, anon;
grant execute on function public.complete_employee_self_registration(text, text, text, text, integer, text, text, boolean, text, text, uuid, uuid) to authenticated;


create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  p public.profiles%rowtype;
  org public.organization_registrations%rowtype;
  dept public.org_departments%rowtype;
  approved boolean := false;
  public_totals jsonb;
  org_totals jsonb;
  department_totals jsonb;
  departments_json jsonb := '[]'::jsonb;
  employees_json jsonb := '[]'::jsonb;
begin
  select jsonb_build_object(
    'nwpp_bags_total', nwpp_bags_total,
    'garment_items_total', garment_items_total,
    'utility_bags_requested_total', utility_bags_requested_total,
    'labour_fee_pending', labour_fee_pending,
    'labour_fee_collected_by_nodal', labour_fee_collected_by_nodal,
    'labour_fee_sent_to_org', labour_fee_sent_to_org,
    'labour_fee_sent_to_admin', labour_fee_sent_to_admin
  ) into public_totals
  from public.public_impact_totals
  where id = true;

  if current_user_id is null then
    return jsonb_build_object('approved', false, 'public_totals', coalesce(public_totals, '{}'::jsonb));
  end if;

  select * into p from public.profiles where id = current_user_id;
  if not found then
    return jsonb_build_object('approved', false, 'public_totals', coalesce(public_totals, '{}'::jsonb));
  end if;

  if p.organization_registration_id is not null then
    select * into org from public.organization_registrations where id = p.organization_registration_id;
    approved := coalesce(org.status = 'approved', false);
  end if;

  if p.department_id is not null then
    select * into dept from public.org_departments where id = p.department_id;
  end if;

  if not approved then
    return jsonb_build_object(
      'approved', false,
      'profile', jsonb_build_object('id', p.id, 'role', p.role, 'status', p.status),
      'organization', case when org.id is null then null else jsonb_build_object('id', org.id, 'organization_name', org.organization_name, 'status', org.status) end,
      'public_totals', coalesce(public_totals, '{}'::jsonb)
    );
  end if;

  select jsonb_build_object(
    'nwpp_bags', coalesce((select sum(bags_count)::bigint from public.nwpp_contributions where organization_registration_id = org.id and status in ('submitted', 'verified')), 0),
    'garments', coalesce((select sum(garment_count)::bigint from public.garment_contributions where organization_registration_id = org.id and status in ('submitted', 'verified')), 0),
    'utility_bags_requested', coalesce((select sum(case when wants_utility_bag then 1 else 0 end)::bigint from public.garment_contributions where organization_registration_id = org.id and status in ('submitted', 'verified')), 0),
    'labour_fee_pending', coalesce((select sum(labour_fee) from public.garment_contributions where organization_registration_id = org.id and wants_utility_bag and payment_status = 'pending' and status in ('submitted', 'verified')), 0),
    'labour_fee_collected_by_nodal', coalesce((select sum(labour_fee) from public.garment_contributions where organization_registration_id = org.id and wants_utility_bag and payment_status = 'collected_by_nodal' and status in ('submitted', 'verified')), 0),
    'labour_fee_sent_to_org', coalesce((select sum(labour_fee) from public.garment_contributions where organization_registration_id = org.id and wants_utility_bag and payment_status = 'sent_to_org' and status in ('submitted', 'verified')), 0),
    'labour_fee_sent_to_admin', coalesce((select sum(labour_fee) from public.garment_contributions where organization_registration_id = org.id and wants_utility_bag and payment_status = 'sent_to_admin' and status in ('submitted', 'verified')), 0)
  ) into org_totals;

  if dept.id is not null then
    select jsonb_build_object(
      'nwpp_bags', coalesce((select sum(bags_count)::bigint from public.nwpp_contributions where department_id = dept.id and status in ('submitted', 'verified')), 0),
      'garments', coalesce((select sum(garment_count)::bigint from public.garment_contributions where department_id = dept.id and status in ('submitted', 'verified')), 0),
      'utility_bags_requested', coalesce((select sum(case when wants_utility_bag then 1 else 0 end)::bigint from public.garment_contributions where department_id = dept.id and status in ('submitted', 'verified')), 0),
      'employee_count', coalesce((select count(*)::bigint from public.profiles where department_id = dept.id and role = 'employee' and status <> 'inactive'), 0)
    ) into department_totals;
  else
    department_totals := jsonb_build_object('nwpp_bags', 0, 'garments', 0, 'utility_bags_requested', 0, 'employee_count', 0);
  end if;

  if p.role = 'org_head' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id,
      'department_name', d.department_name,
      'office_location', d.office_location,
      'planned_employee_count', d.planned_employee_count,
      'actual_employee_count', coalesce((select count(*)::bigint from public.profiles ep where ep.department_id = d.id and ep.role = 'employee' and ep.status <> 'inactive'), 0),
      'nodal_profile_id', d.nodal_profile_id,
      'nodal_name', nullif(trim(concat_ws(' ', np.first_name, np.middle_name, np.last_name)), ''),
      'nwpp_bags', coalesce((select sum(n.bags_count)::bigint from public.nwpp_contributions n where n.department_id = d.id and n.status in ('submitted', 'verified')), 0),
      'garments', coalesce((select sum(g.garment_count)::bigint from public.garment_contributions g where g.department_id = d.id and g.status in ('submitted', 'verified')), 0)
    ) order by d.created_at desc), '[]'::jsonb)
    into departments_json
    from public.org_departments d
    left join public.profiles np on np.id = d.nodal_profile_id
    where d.organization_registration_id = org.id;
  elsif dept.id is not null then
    departments_json := jsonb_build_array(jsonb_build_object(
      'id', dept.id,
      'department_name', dept.department_name,
      'office_location', dept.office_location,
      'planned_employee_count', dept.planned_employee_count,
      'actual_employee_count', coalesce((select count(*)::bigint from public.profiles ep where ep.department_id = dept.id and ep.role = 'employee' and ep.status <> 'inactive'), 0),
      'nodal_profile_id', dept.nodal_profile_id,
      'nwpp_bags', (department_totals->>'nwpp_bags')::bigint,
      'garments', (department_totals->>'garments')::bigint
    ));
  end if;

  if p.role = 'org_head' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', ep.id,
      'role', ep.role,
      'status', ep.status,
      'department_id', ep.department_id,
      'first_name', ep.first_name,
      'middle_name', ep.middle_name,
      'last_name', ep.last_name,
      'email', ep.email,
      'mobile_number', ep.mobile_number,
      'photograph_url', ep.photograph_url,
      'wants_volunteer', ep.wants_volunteer,
      'verification_code', ep.verification_code
    ) order by ep.created_at desc), '[]'::jsonb)
    into employees_json
    from public.profiles ep
    where ep.organization_registration_id = org.id
      and ep.role in ('nodal_officer', 'employee');
  elsif p.role = 'nodal_officer' and p.department_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', ep.id,
      'role', ep.role,
      'status', ep.status,
      'department_id', ep.department_id,
      'first_name', ep.first_name,
      'middle_name', ep.middle_name,
      'last_name', ep.last_name,
      'gender', ep.gender,
      'age', ep.age,
      'mobile_number', ep.mobile_number,
      'email', ep.email,
      'residential_address', ep.residential_address,
      'office_location', ep.office_location,
      'social_media_handle', ep.social_media_handle,
      'photograph_url', ep.photograph_url,
      'wants_volunteer', ep.wants_volunteer,
      'verification_code', ep.verification_code
    ) order by ep.created_at desc), '[]'::jsonb)
    into employees_json
    from public.profiles ep
    where ep.department_id = p.department_id
      and ep.role = 'employee';
  end if;

  return jsonb_build_object(
    'approved', true,
    'profile', jsonb_build_object(
      'id', p.id,
      'role', p.role,
      'status', p.status,
      'organization_registration_id', p.organization_registration_id,
      'department_id', p.department_id,
      'first_name', p.first_name,
      'middle_name', p.middle_name,
      'last_name', p.last_name,
      'email', p.email,
      'mobile_number', p.mobile_number,
      'wants_volunteer', p.wants_volunteer,
      'office_location', p.office_location,
      'residential_address', p.residential_address,
      'social_media_handle', p.social_media_handle,
      'photograph_url', p.photograph_url
    ),
    'organization', jsonb_build_object(
      'id', org.id,
      'organization_name', org.organization_name,
      'status', org.status,
      'company_logo_url', org.company_logo_url,
      'organization_social_handle', org.organization_social_handle,
      'target_nwpp_bags', org.target_nwpp_bags,
      'estimated_participants', org.estimated_participants
    ),
    'department', case when dept.id is null then null else jsonb_build_object('id', dept.id, 'department_name', dept.department_name, 'office_location', dept.office_location, 'planned_employee_count', dept.planned_employee_count) end,
    'public_totals', coalesce(public_totals, '{}'::jsonb),
    'org_totals', coalesce(org_totals, '{}'::jsonb),
    'department_totals', coalesce(department_totals, '{}'::jsonb),
    'departments', departments_json,
    'employees', employees_json
  );
end;
$$;


create or replace function public.get_registration_details(p_org_id uuid, p_dept_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_org_name text;
  v_org_status text;
  v_dept_name text;
  v_office_location text;
begin
  select organization_name, status into v_org_name, v_org_status
  from public.organization_registrations
  where id = p_org_id;

  if v_org_name is null then
    return null;
  end if;

  select department_name, office_location into v_dept_name, v_office_location
  from public.org_departments
  where id = p_dept_id and organization_registration_id = p_org_id;

  if v_dept_name is null then
    return null;
  end if;

  return jsonb_build_object(
    'organization_name', v_org_name,
    'organization_status', v_org_status,
    'department_name', v_dept_name,
    'office_location', v_office_location
  );
end;
$$;

grant execute on function public.get_registration_details(uuid, uuid) to anon, authenticated;
