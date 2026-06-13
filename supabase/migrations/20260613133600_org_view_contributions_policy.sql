create policy "Organisation heads can view organisation NWPP contributions"
on public.nwpp_contributions
for select
to authenticated
using (
  private.profile_role(auth.uid()) = 'org_head' and organization_registration_id = private.profile_org_id(auth.uid())
);

create policy "Nodal officers can view department NWPP contributions"
on public.nwpp_contributions
for select
to authenticated
using (
  private.profile_role(auth.uid()) = 'nodal_officer' and department_id = private.profile_department_id(auth.uid())
);

create policy "Organisation heads can view organisation garment contributions"
on public.garment_contributions
for select
to authenticated
using (
  private.profile_role(auth.uid()) = 'org_head' and organization_registration_id = private.profile_org_id(auth.uid())
);

create policy "Nodal officers can view department garment contributions"
on public.garment_contributions
for select
to authenticated
using (
  private.profile_role(auth.uid()) = 'nodal_officer' and department_id = private.profile_department_id(auth.uid())
);
