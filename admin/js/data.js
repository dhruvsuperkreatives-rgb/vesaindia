export function buildAdminModel(raw) {
    const contributionsByOrg = new Map();
    const garmentsByOrg = new Map();
    const peopleByOrg = new Map();
    const departmentsByOrg = new Map();

    const userRoles = new Map((raw.profiles || []).map((p) => [p.id, p.role]));
    const getBreakdownObj = () => ({
        employee: new Set(),
        nodal_officer: new Set(),
        org_head: new Set()
    });

    const nwppBreakdownByOrg = new Map();
    const garmentsBreakdownByOrg = new Map();
    const diariesBreakdownByOrg = new Map();

    for (const item of raw.contributions) {
        if (item.status !== "submitted" && item.status !== "verified") continue;
        const id = item.organization_registration_id;
        contributionsByOrg.set(id, (contributionsByOrg.get(id) || 0) + Number(item.bags_count || 0));
        if (item.user_id) {
            if (!nwppBreakdownByOrg.has(id)) nwppBreakdownByOrg.set(id, getBreakdownObj());
            const role = userRoles.get(item.user_id) || "employee";
            const roleKey = role === "admin" ? "org_head" : (role === "nodal_officer" || role === "org_head" || role === "employee" ? role : "employee");
            nwppBreakdownByOrg.get(id)[roleKey].add(item.user_id);
        }
    }

    for (const item of raw.garments) {
        if (item.status !== "submitted" && item.status !== "verified") continue;
        const id = item.organization_registration_id;
        garmentsByOrg.set(id, (garmentsByOrg.get(id) || 0) + Number(item.garment_count || 0));
        if (item.user_id) {
            if (!garmentsBreakdownByOrg.has(id)) garmentsBreakdownByOrg.set(id, getBreakdownObj());
            const role = userRoles.get(item.user_id) || "employee";
            const roleKey = role === "admin" ? "org_head" : (role === "nodal_officer" || role === "org_head" || role === "employee" ? role : "employee");
            garmentsBreakdownByOrg.get(id)[roleKey].add(item.user_id);
        }
    }

    for (const profile of raw.profiles) {
        const id = profile.organization_registration_id;
        if (!id) continue;
        if (!peopleByOrg.has(id)) peopleByOrg.set(id, { nodal: 0, employees: 0 });
        const counts = peopleByOrg.get(id);
        if (profile.role === "nodal_officer") counts.nodal += 1;
        if (profile.role === "employee") counts.employees += 1;
    }

    for (const department of raw.departments) {
        const id = department.organization_registration_id;
        if (!id) continue;
        departmentsByOrg.set(id, (departmentsByOrg.get(id) || 0) + 1);
    }

    const diariesByOrg = new Map();
    const diaryProgram = raw.programs?.find((p) => p.slug === "diary");
    if (diaryProgram && raw.programContributions) {
        for (const item of raw.programContributions) {
            if (item.status !== "submitted" && item.status !== "verified") continue;
            if (item.program_id === diaryProgram.id) {
                const id = item.organization_registration_id;
                diariesByOrg.set(id, (diariesByOrg.get(id) || 0) + Number(item.quantity || 0));
                if (item.user_id) {
                    if (!diariesBreakdownByOrg.has(id)) diariesBreakdownByOrg.set(id, getBreakdownObj());
                    const role = userRoles.get(item.user_id) || "employee";
                    const roleKey = role === "admin" ? "org_head" : (role === "nodal_officer" || role === "org_head" || role === "employee" ? role : "employee");
                    diariesBreakdownByOrg.get(id)[roleKey].add(item.user_id);
                }
            }
        }
    }

    const programIdToSlug = new Map((raw.programs || []).map((p) => [p.id, p.slug]));
    const selectedProgramsByOrg = new Map();
    if (raw.organizationPrograms) {
        for (const item of raw.organizationPrograms) {
            const orgId = item.organization_registration_id;
            if (!selectedProgramsByOrg.has(orgId)) {
                selectedProgramsByOrg.set(orgId, new Set());
            }
            selectedProgramsByOrg.get(orgId).add(item.program_id);
        }
    }

    const organisations = raw.organisations.map((org) => {
        const people = peopleByOrg.get(org.id) || { nodal: 0, employees: 0 };
        const nwB = nwppBreakdownByOrg.get(org.id) || getBreakdownObj();
        const garB = garmentsBreakdownByOrg.get(org.id) || getBreakdownObj();
        const diaB = diariesBreakdownByOrg.get(org.id) || getBreakdownObj();
        const orgSelectedIds = Array.from(selectedProgramsByOrg.get(org.id) || []);
        const orgSelectedSlugs = orgSelectedIds.map(id => programIdToSlug.get(id)).filter(Boolean);

        const hasSelection = orgSelectedSlugs.length > 0;
        const showNwpp = !hasSelection || orgSelectedSlugs.includes("nwpp_bag");
        const showGarments = !hasSelection || orgSelectedSlugs.includes("garment");
        const showDiaries = !hasSelection || orgSelectedSlugs.includes("diary");

        return {
            ...org,
            nwppAchieved: showNwpp ? (contributionsByOrg.get(org.id) || 0) : 0,
            garmentsAchieved: showGarments ? (garmentsByOrg.get(org.id) || 0) : 0,
            diariesAchieved: showDiaries ? (diariesByOrg.get(org.id) || 0) : 0,
            nwppBreakdown: showNwpp ? { employee: nwB.employee.size, nodal: nwB.nodal_officer.size, head: nwB.org_head.size } : { employee: 0, nodal: 0, head: 0 },
            garmentsBreakdown: showGarments ? { employee: garB.employee.size, nodal: garB.nodal_officer.size, head: garB.org_head.size } : { employee: 0, nodal: 0, head: 0 },
            diariesBreakdown: showDiaries ? { employee: diaB.employee.size, nodal: diaB.nodal_officer.size, head: diaB.org_head.size } : { employee: 0, nodal: 0, head: 0 },
            nodalCount: Math.max(people.nodal, departmentsByOrg.get(org.id) || 0),
            employeeCount: people.employees,
            selectedProgramIds: orgSelectedIds,
            selectedProgramSlugs: orgSelectedSlugs
        };
    });

    return { ...raw, organisations };
}

export function replaceOrganisation(model, updated) {
    model.organisations = model.organisations.map((org) => (
        org.id === updated.id ? { ...org, ...updated } : org
    ));
}

export function replaceProgram(model, program) {
    const index = model.programs.findIndex((item) => item.id === program.id);
    if (index === -1) model.programs.push(program);
    else model.programs[index] = program;
    model.programs.sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || a.name.localeCompare(b.name));
}
