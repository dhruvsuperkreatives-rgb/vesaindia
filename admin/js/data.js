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

    const organisations = raw.organisations.map((org) => {
        const people = peopleByOrg.get(org.id) || { nodal: 0, employees: 0 };
        const nwB = nwppBreakdownByOrg.get(org.id) || getBreakdownObj();
        const garB = garmentsBreakdownByOrg.get(org.id) || getBreakdownObj();
        const diaB = diariesBreakdownByOrg.get(org.id) || getBreakdownObj();
        return {
            ...org,
            nwppAchieved: contributionsByOrg.get(org.id) || 0,
            garmentsAchieved: garmentsByOrg.get(org.id) || 0,
            diariesAchieved: diariesByOrg.get(org.id) || 0,
            nwppBreakdown: { employee: nwB.employee.size, nodal: nwB.nodal_officer.size, head: nwB.org_head.size },
            garmentsBreakdown: { employee: garB.employee.size, nodal: garB.nodal_officer.size, head: garB.org_head.size },
            diariesBreakdown: { employee: diaB.employee.size, nodal: diaB.nodal_officer.size, head: diaB.org_head.size },
            nodalCount: Math.max(people.nodal, departmentsByOrg.get(org.id) || 0),
            employeeCount: people.employees
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
