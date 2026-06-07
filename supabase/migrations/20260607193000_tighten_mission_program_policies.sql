drop policy if exists "Admins can manage organisation programs"
on public.organization_programs;

drop policy if exists "Organisation owners can select programs"
on public.organization_programs;

create policy "Organisation owners and admins can select programs"
on public.organization_programs
for insert
to authenticated
with check (
  private.is_admin((select auth.uid()))
  or exists (
    select 1
    from public.organization_registrations org
    where org.id = organization_registration_id
      and org.owner_id = (select auth.uid())
      and org.status = 'pending'
  )
);

create policy "Admins can update organisation programs"
on public.organization_programs
for update
to authenticated
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

create policy "Admins can delete organisation programs"
on public.organization_programs
for delete
to authenticated
using (private.is_admin((select auth.uid())));
