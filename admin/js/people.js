import { escapeHtml, numberText, safeLink } from "./utils.js";

function initials(person) {
    return [person.first_name, person.last_name]
        .filter(Boolean)
        .map((part) => String(part).charAt(0).toUpperCase())
        .join("")
        .slice(0, 2) || "VM";
}

function personCard(person) {
    const name = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");
    const photoUrl = safeLink(person.photograph_url);
    const socialUrl = safeLink(person.social_media_handle);
    const role = String(person.role || "member").replaceAll("_", " ");
    return `
        <article class="mission-person-card ${person.wants_volunteer ? "volunteer" : ""}">
            ${photoUrl
                ? `<a href="${escapeHtml(photoUrl)}" target="_blank" rel="noopener noreferrer">
                    <img class="mission-person-photo" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(name)}" loading="lazy">
                   </a>`
                : `<div class="mission-person-photo mission-person-fallback">${escapeHtml(initials(person))}</div>`}
            <div class="mission-person-details">
                <div class="org-heading">
                    <div>
                        <div class="org-name">${escapeHtml(name || "Mission member")}</div>
                        <div class="org-meta">${escapeHtml(role)} · ${escapeHtml(person.office_location || "Location not added")}</div>
                    </div>
                    <span class="badge ${person.wants_volunteer ? "active" : ""}">
                        ${person.wants_volunteer ? "Volunteer" : "Non-volunteer"}
                    </span>
                </div>
                <div class="mission-person-scope">
                    <strong>${escapeHtml(person.organization_code)} · ${escapeHtml(person.organization_name)}</strong>
                    <span>${escapeHtml(person.department_code || "000")} · ${escapeHtml(person.department_name || "Organisation leadership")}</span>
                    ${person.nodal_name ? `<span>Nodal officer: ${escapeHtml(person.nodal_name)}</span>` : ""}
                </div>
                ${person.social_media_handle
                    ? socialUrl
                        ? `<a class="mission-social" href="${escapeHtml(socialUrl)}" target="_blank" rel="noopener noreferrer">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> ${escapeHtml(person.social_media_handle)}
                           </a>`
                        : `<span class="mission-social"><i class="fa-solid fa-at"></i> ${escapeHtml(person.social_media_handle)}</span>`
                    : `<span class="org-meta">No social handle</span>`}
                <div class="mission-code-row">
                    <span class="verification-code">${escapeHtml(person.verification_code || "Pending")}</span>
                    ${person.verification_code
                        ? `<button class="secondary-button copy-person-code" type="button" data-copy-person-code="${escapeHtml(person.verification_code)}">
                            <i class="fa-regular fa-copy"></i> Copy
                           </button>`
                        : ""}
                </div>
            </div>
        </article>
    `;
}

export function renderPeople(container, people, filters, selectedOrganisation = null) {
    const search = filters.search.toLowerCase();
    const filtered = people.filter((person) => {
        if (filters.organizationId && person.organization_id !== filters.organizationId) return false;
        if (filters.departmentId && person.department_id !== filters.departmentId) return false;
        if (filters.volunteer === "volunteer" && !person.wants_volunteer) return false;
        if (filters.volunteer === "non_volunteer" && person.wants_volunteer) return false;
        if (!search) return true;
        return [
            person.first_name, person.middle_name, person.last_name,
            person.social_media_handle, person.verification_code,
            person.organization_name, person.department_name, person.nodal_name
        ].filter(Boolean).join(" ").toLowerCase().includes(search);
    });

    container.innerHTML = `
        ${selectedOrganisation ? `
            <div class="selected-org-context">
                <div>
                    <span class="eyebrow">Organisation view</span>
                    <strong>${escapeHtml(selectedOrganisation.organization_name)}</strong>
                    <span class="org-meta">
                        ${numberText(selectedOrganisation.employeeCount)} employees ·
                        ${numberText(selectedOrganisation.nodalCount)} nodal officers
                    </span>
                </div>
                <span class="badge ${escapeHtml(selectedOrganisation.status)}">${escapeHtml(selectedOrganisation.status)}</span>
            </div>
        ` : ""}
        <div class="directory-summary">Showing ${numberText(filtered.length)} of ${numberText(people.length)} active mission members</div>
        <div class="mission-people-grid">
            ${filtered.length
                ? filtered.map(personCard).join("")
                : `<div class="empty-state"><i class="fa-solid fa-users-slash"></i><strong>No matching people</strong><div>Change the directory filters.</div></div>`}
        </div>
    `;
}

export function populatePeopleFilters(people, filters, allOrganisations = []) {
    const organizationSelect = document.getElementById("adminPeopleOrganisation");
    const departmentSelect = document.getElementById("adminPeopleDepartment");
    const peopleOrganisations = new Map(people.map((person) => [
        person.organization_id,
        { id: person.organization_id, code: person.organization_code, name: person.organization_name }
    ]));
    const organisations = allOrganisations.map((org) => ({
        id: org.id,
        code: org.organization_code || peopleOrganisations.get(org.id)?.code || "---",
        name: org.organization_name
    }));
    const departments = [...new Map(people
        .filter((person) => person.department_id)
        .filter((person) => !filters.organizationId || person.organization_id === filters.organizationId)
        .map((person) => [
            person.department_id,
            {
                id: person.department_id,
                code: person.department_code,
                name: person.department_name,
                nodalName: person.nodal_name
            }
        ])).values()];

    organizationSelect.innerHTML = `<option value="">All organisations</option>${organisations.map((item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.code)} · ${escapeHtml(item.name)}</option>`
    ).join("")}`;
    organizationSelect.value = filters.organizationId;

    departmentSelect.innerHTML = `<option value="">All nodal officers</option>${departments.map((item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.code)} · ${escapeHtml(item.nodalName || "Unassigned")} · ${escapeHtml(item.name)}</option>`
    ).join("")}`;
    departmentSelect.value = departments.some((item) => item.id === filters.departmentId) ? filters.departmentId : "";
    filters.departmentId = departmentSelect.value;
}
