alter table public.organization_registrations
add column if not exists head_office_state text,
add column if not exists head_office_district text,
add column if not exists head_office_location text;

update public.organization_registrations
set
  head_office_location = coalesce(head_office_location, core_work_location)
where core_work_location is not null
  and head_office_location is null;
