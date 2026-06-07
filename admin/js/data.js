export function buildAdminModel(raw) {
    const contributionsByOrg = new Map();
    const garmentsByOrg = new Map();
    const peopleByOrg = new Map();
    const departmentsByOrg = new Map();

    for (const item of raw.contributions) {
        const id = item.organization_registration_id;
        contributionsByOrg.set(id, (contributionsByOrg.get(id) || 0) + Number(item.bags_count || 0));
    }

    for (const item of raw.garments) {
        const id = item.organization_registration_id;
        garmentsByOrg.set(id, (garmentsByOrg.get(id) || 0) + Number(item.garment_count || 0));
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

    const organisations = raw.organisations.map((org) => {
        const people = peopleByOrg.get(org.id) || { nodal: 0, employees: 0 };
        return {
            ...org,
            nwppAchieved: contributionsByOrg.get(org.id) || 0,
            garmentsAchieved: garmentsByOrg.get(org.id) || 0,
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
