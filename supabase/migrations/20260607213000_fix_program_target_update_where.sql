create or replace function private.refresh_organisation_nwpp_targets()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.slug = 'nwpp_bag'
    and new.target_per_participant is distinct from old.target_per_participant then
    update public.organization_registrations
    set target_nwpp_bags = round(estimated_participants * new.target_per_participant)
    where id is not null;
  end if;

  return new;
end;
$$;

revoke execute on function private.refresh_organisation_nwpp_targets()
from public, anon, authenticated;
