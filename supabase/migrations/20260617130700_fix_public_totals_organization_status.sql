-- redfine the trigger function to only sum contributions from approved organizations
create or replace function public.refresh_public_impact_totals()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.public_impact_totals (
    id, nwpp_bags_total, garment_items_total, utility_bags_requested_total,
    labour_fee_pending, labour_fee_collected_by_nodal, labour_fee_sent_to_org,
    labour_fee_sent_to_admin, updated_at
  )
  values (
    true,
    coalesce((select sum(c.bags_count)::bigint 
              from public.nwpp_contributions c
              join public.organization_registrations o on c.organization_registration_id = o.id
              where c.status in ('submitted', 'verified') and o.status = 'approved'), 0),
    coalesce((select sum(c.garment_count)::bigint 
              from public.garment_contributions c
              join public.organization_registrations o on c.organization_registration_id = o.id
              where c.status in ('submitted', 'verified') and o.status = 'approved'), 0),
    coalesce((select sum(case when c.wants_utility_bag then 1 else 0 end)::bigint 
              from public.garment_contributions c
              join public.organization_registrations o on c.organization_registration_id = o.id
              where c.status in ('submitted', 'verified') and o.status = 'approved'), 0),
    coalesce((select sum(c.labour_fee) 
              from public.garment_contributions c
              join public.organization_registrations o on c.organization_registration_id = o.id
              where c.wants_utility_bag and c.payment_status = 'pending' and c.status in ('submitted', 'verified') and o.status = 'approved'), 0),
    coalesce((select sum(c.labour_fee) 
              from public.garment_contributions c
              join public.organization_registrations o on c.organization_registration_id = o.id
              where c.wants_utility_bag and c.payment_status = 'collected_by_nodal' and c.status in ('submitted', 'verified') and o.status = 'approved'), 0),
    coalesce((select sum(c.labour_fee) 
              from public.garment_contributions c
              join public.organization_registrations o on c.organization_registration_id = o.id
              where c.wants_utility_bag and c.payment_status = 'sent_to_org' and c.status in ('submitted', 'verified') and o.status = 'approved'), 0),
    coalesce((select sum(c.labour_fee) 
              from public.garment_contributions c
              join public.organization_registrations o on c.organization_registration_id = o.id
              where c.wants_utility_bag and c.payment_status = 'sent_to_admin' and c.status in ('submitted', 'verified') and o.status = 'approved'), 0),
    timezone('utc'::text, now())
  )
  on conflict (id) do update set
    nwpp_bags_total = excluded.nwpp_bags_total,
    garment_items_total = excluded.garment_items_total,
    utility_bags_requested_total = excluded.utility_bags_requested_total,
    labour_fee_pending = excluded.labour_fee_pending,
    labour_fee_collected_by_nodal = excluded.labour_fee_collected_by_nodal,
    labour_fee_sent_to_org = excluded.labour_fee_sent_to_org,
    labour_fee_sent_to_admin = excluded.labour_fee_sent_to_admin,
    updated_at = excluded.updated_at;
  return coalesce(new, old);
end;
$$;

-- add a trigger on organization_registrations updates to recalculate public totals on approval status changes
drop trigger if exists refresh_public_totals_after_org_update on public.organization_registrations;
create trigger refresh_public_totals_after_org_update
after update of status on public.organization_registrations
for each row
execute function refresh_public_impact_totals();

-- redefine get_dashboard_summary() function to return org_totals and organizations_joined_count when pending approval
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
  org_count bigint;
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

  select count(*)::bigint into org_count from public.organization_registrations where status = 'approved';

  if current_user_id is null then
    return jsonb_build_object('approved', false, 'public_totals', coalesce(public_totals, '{}'::jsonb), 'organizations_joined_count', org_count);
  end if;

  select * into p from public.profiles where id = current_user_id;
  if not found then
    return jsonb_build_object('approved', false, 'public_totals', coalesce(public_totals, '{}'::jsonb), 'organizations_joined_count', org_count);
  end if;

  if p.organization_registration_id is not null then
    select * into org from public.organization_registrations where id = p.organization_registration_id;
    approved := coalesce(org.status = 'approved', false);
  end if;

  if p.department_id is not null then
    select * into dept from public.org_departments where id = p.department_id;
  end if;

  if org.id is not null then
    select jsonb_build_object(
      'nwpp_bags', coalesce((select sum(bags_count)::bigint from public.nwpp_contributions where organization_registration_id = org.id and status in ('submitted', 'verified')), 0),
      'garments', coalesce((select sum(garment_count)::bigint from public.garment_contributions where organization_registration_id = org.id and status in ('submitted', 'verified')), 0),
      'utility_bags_requested', coalesce((select sum(case when wants_utility_bag then 1 else 0 end)::bigint from public.garment_contributions where organization_registration_id = org.id and status in ('submitted', 'verified')), 0),
      'labour_fee_pending', coalesce((select sum(labour_fee) from public.garment_contributions where organization_registration_id = org.id and wants_utility_bag and payment_status = 'pending' and status in ('submitted', 'verified')), 0),
      'labour_fee_collected_by_nodal', coalesce((select sum(labour_fee) from public.garment_contributions where organization_registration_id = org.id and wants_utility_bag and payment_status = 'collected_by_nodal' and status in ('submitted', 'verified')), 0),
      'labour_fee_sent_to_org', coalesce((select sum(labour_fee) from public.garment_contributions where organization_registration_id = org.id and wants_utility_bag and payment_status = 'sent_to_org' and status in ('submitted', 'verified')), 0),
      'labour_fee_sent_to_admin', coalesce((select sum(labour_fee) from public.garment_contributions where organization_registration_id = org.id and wants_utility_bag and payment_status = 'sent_to_admin' and status in ('submitted', 'verified')), 0)
    ) into org_totals;
  else
    org_totals := '{}'::jsonb;
  end if;

  if not approved then
    return jsonb_build_object(
      'approved', false,
      'profile', jsonb_build_object(
        'id', p.id,
        'role', p.role,
        'status', p.status,
        'office_location', p.office_location,
        'residential_address', p.residential_address,
        'social_media_handle', p.social_media_handle,
        'photograph_url', p.photograph_url,
        'pin_code', p.pin_code
      ),
      'organization', case when org.id is null then null else jsonb_build_object('id', org.id, 'organization_name', org.organization_name, 'status', org.status) end,
      'public_totals', coalesce(public_totals, '{}'::jsonb),
      'org_totals', coalesce(org_totals, '{}'::jsonb),
      'organizations_joined_count', org_count
    );
  end if;

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
      'verification_code', ep.verification_code,
      'pin_code', ep.pin_code
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
      'photograph_url', p.photograph_url,
      'pin_code', p.pin_code
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
    'employees', employees_json,
    'organizations_joined_count', org_count
  );
end;
$$;
