-- Drop stale overloaded versions of complete_employee_self_registration function
-- to avoid ambiguity in PostgREST RPC resolution.

-- Drop Version 1: 11-parameter signature
DROP FUNCTION IF EXISTS public.complete_employee_self_registration(
    text,  -- p_first_name
    text,  -- p_middle_name
    text,  -- p_last_name
    text,  -- p_gender
    integer, -- p_age
    text,  -- p_mobile_number
    boolean, -- p_wants_volunteer
    text,  -- p_social_media_handle
    text,  -- p_photograph_url
    uuid,  -- p_organization_id
    uuid   -- p_department_id
);

-- Drop Version 3: 13-parameter signature (includes p_residential_address)
DROP FUNCTION IF EXISTS public.complete_employee_self_registration(
    text,  -- p_first_name
    text,  -- p_middle_name
    text,  -- p_last_name
    text,  -- p_gender
    integer, -- p_age
    text,  -- p_mobile_number
    text,  -- p_residential_address
    text,  -- p_office_location
    boolean, -- p_wants_volunteer
    text,  -- p_social_media_handle
    text,  -- p_photograph_url
    uuid,  -- p_organization_id
    uuid   -- p_department_id
);
