import { supabase } from "../../supabaseClient.js";

async function optionalQuery(label, query) {
    const { data, error } = await query;
    return {
        data: error ? [] : (data || []),
        warning: error ? `${label}: ${error.message}` : null
    };
}

export async function ensureAdmin() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { redirect: "/login/" };

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") return { redirect: "/dashboard/" };
    return { user };
}

export async function loadAdminData() {
    const organisationsResult = await supabase
        .from("organization_registrations")
        .select("*")
        .order("created_at", { ascending: false });

    if (organisationsResult.error) throw organisationsResult.error;

    const [nwpp, garments, profiles, departments, programs, missionPeople, programContributions] = await Promise.all([
        optionalQuery("NWPP contributions", supabase
            .from("nwpp_contributions")
            .select("id, created_at, organization_registration_id, bags_count, status")),
        optionalQuery("Garment contributions", supabase
            .from("garment_contributions")
            .select("id, created_at, organization_registration_id, garment_count, status")),
        optionalQuery("Organisation members", supabase
            .from("profiles")
            .select("id, role, status, organization_registration_id")),
        optionalQuery("Nodal departments", supabase
            .from("org_departments")
            .select("id, organization_registration_id, nodal_profile_id")),
        optionalQuery("Program settings", supabase
            .from("mission_programs")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true })),
        optionalQuery("Mission people", supabase.rpc("get_mission_people")),
        optionalQuery("Program contributions", supabase
            .from("program_contributions")
            .select("id, created_at, organization_registration_id, program_id, quantity, status"))
    ]);

    return {
        organisations: organisationsResult.data || [],
        contributions: nwpp.data,
        garments: garments.data,
        profiles: profiles.data,
        departments: departments.data,
        programs: programs.data,
        missionPeople: missionPeople.data,
        programContributions: programContributions.data,
        warnings: [nwpp.warning, garments.warning, profiles.warning, departments.warning, programs.warning, missionPeople.warning, programContributions.warning].filter(Boolean)
    };
}

export async function saveProgram(program) {
    if (program.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(program.id)) {
        throw new Error("Program ID is missing or invalid. Refresh Settings and try again.");
    }

    const payload = {
        name: program.name,
        slug: program.slug,
        description: program.description,
        is_active: program.is_active,
        show_on_registration: program.show_on_registration,
        minimum_quantity: program.minimum_quantity,
        unit_label: program.unit_label,
        target_per_participant: program.target_per_participant,
        utility_bag_available: program.utility_bag_available,
        utility_bag_fee: program.utility_bag_fee,
        sort_order: program.sort_order
    };
    const query = program.id
        ? supabase.from("mission_programs").update(payload).eq("id", program.id)
        : supabase.from("mission_programs").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
}

export async function setProgramActive(id, isActive) {
    const { data, error } = await supabase
        .from("mission_programs")
        .update({ is_active: isActive })
        .eq("id", id)
        .select("*")
        .single();
    if (error) throw error;
    return data;
}

export async function updateOrganisation(id, changes) {
    const { data, error } = await supabase
        .from("organization_registrations")
        .update(changes)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function deleteOrganisation(id) {
    const { error } = await supabase
        .from("organization_registrations")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

export async function signOut() {
    await supabase.auth.signOut();
}
