import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MemberDetails = {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  age?: number;
  mobile_number?: string;
  email?: string;
  residential_address?: string;
  office_location?: string;
  social_media_handle?: string;
  photograph_url?: string;
  wants_volunteer?: boolean;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function normalizedDetails(input: Record<string, unknown>): MemberDetails {
    const wantsVolunteer = Boolean(input.wants_volunteer);
    const socialHandle = String(input.social_media_handle || "").trim();
    const photographUrl = String(input.photograph_url || "").trim();
    const age = Number(input.age);

    if (!Number.isInteger(age) || age < 1 || age > 125) {
        throw new Error("Age must be a whole number between 1 and 125.");
    }

  return {
    first_name: requiredString(input.first_name, "First name"),
    middle_name: typeof input.middle_name === "string" ? input.middle_name.trim() || undefined : undefined,
    last_name: requiredString(input.last_name, "Last name"),
    gender: requiredString(input.gender, "Gender"),
    age,
    mobile_number: requiredString(input.mobile_number, "Mobile number"),
    email: requiredString(input.email, "Email").toLowerCase(),
    residential_address: requiredString(input.residential_address, "Residential address"),
    office_location: requiredString(input.office_location, "Office location"),
    social_media_handle: socialHandle || undefined,
    photograph_url: wantsVolunteer && photographUrl ? photographUrl : undefined,
    wants_volunteer: wantsVolunteer,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Supabase function environment is not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing authorization token." }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid user session." }, 401);

    const callerId = userData.user.id;
    const body = await req.json();
    const action = requiredString(body.action, "Action");

    const { data: caller, error: callerError } = await supabase
      .from("profiles")
      .select("id, role, status, organization_registration_id, department_id")
      .eq("id", callerId)
      .single();

    if (callerError || !caller) return json({ error: "Caller profile was not found." }, 403);

    const { data: org, error: orgError } = await supabase
      .from("organization_registrations")
      .select("id, status")
      .eq("id", caller.organization_registration_id)
      .single();

    if (orgError || !org || org.status !== "approved") {
      return json({ error: "Organisation must be approved before creating accounts." }, 403);
    }

    const password = requiredString(body.password, "Password");
    if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);

    if (action === "create_department_nodal") {
      if (caller.role !== "org_head") {
        return json({ error: "Only the organisation head can create departments." }, 403);
      }

      const departmentName = requiredString(body.department_name, "Department name");
      const departmentLocation = requiredString(body.department_location, "Department location");
      const plannedEmployeeCount = Math.max(0, Number(body.planned_employee_count || 0));
      const details = normalizedDetails(body.nodal_officer || {});

      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: details.email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "nodal_officer",
          first_name: details.first_name,
          last_name: details.last_name,
        },
      });

      if (createError || !authUser.user) {
        return json({ error: createError?.message || "Could not create Nodal Officer login." }, 400);
      }

      const { data: department, error: departmentError } = await supabase
        .from("org_departments")
        .insert({
          organization_registration_id: caller.organization_registration_id,
          department_name: departmentName,
          office_location: departmentLocation,
          planned_employee_count: plannedEmployeeCount,
          created_by: callerId,
        })
        .select("id")
        .single();

      if (departmentError || !department) {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return json({ error: departmentError?.message || "Could not create department." }, 400);
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authUser.user.id,
        role: "nodal_officer",
        status: "active",
        organization_registration_id: caller.organization_registration_id,
        department_id: department.id,
        created_by: callerId,
        ...details,
      });

      if (profileError) {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return json({ error: profileError.message }, 400);
      }

      await supabase
        .from("org_departments")
        .update({ nodal_profile_id: authUser.user.id })
        .eq("id", department.id);

      return json({ ok: true, user_id: authUser.user.id, department_id: department.id });
    }

    if (action === "create_employee") {
      if (caller.role !== "nodal_officer" || !caller.department_id) {
        return json({ error: "Only a department Nodal Officer can create employee accounts." }, 403);
      }

      const details = normalizedDetails(body.employee || {});
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: details.email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "employee",
          first_name: details.first_name,
          last_name: details.last_name,
        },
      });

      if (createError || !authUser.user) {
        return json({ error: createError?.message || "Could not create employee login." }, 400);
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authUser.user.id,
        role: "employee",
        status: "active",
        organization_registration_id: caller.organization_registration_id,
        department_id: caller.department_id,
        created_by: callerId,
        ...details,
      });

      if (profileError) {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return json({ error: profileError.message }, 400);
      }

      return json({ ok: true, user_id: authUser.user.id, department_id: caller.department_id });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error." }, 400);
  }
});
