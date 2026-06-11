import {
    emptyState,
    escapeHtml,
    numberText,
    organisationInitial,
    progressPercent,
    safeLink
} from "./utils.js";

function logoMarkup(org) {
    return org.company_logo_url
        ? `<img src="${escapeHtml(org.company_logo_url)}" alt="">`
        : escapeHtml(organisationInitial(org.organization_name));
}

function orgUrlMarkup(org) {
    const value = org.organization_social_handle;
    const href = safeLink(value);
    if (!value) return "No URL provided";
    return href
        ? `<a class="org-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>`
        : escapeHtml(value);
}

export function renderOrganisations(container, model, search = "") {
    const term = search.trim().toLowerCase();
    const organisations = model.organisations.filter((org) => (
        !term ||
        String(org.organization_name || "").toLowerCase().includes(term) ||
        String(org.core_work_location || "").toLowerCase().includes(term)
    ));

    if (!organisations.length) {
        container.innerHTML = emptyState("fa-building", "No organisations found", "Try a different search term.");
        return;
    }

    container.innerHTML = `<div class="organisations-grid">${organisations.map((org) => {
        const progress = progressPercent(org.nwppAchieved, org.target_nwpp_bags);
        return `
            <article class="organisation-card">
                <div class="org-heading">
                    <div class="org-identity">
                        <div class="org-logo">${logoMarkup(org)}</div>
                        <div>
                            <div class="org-name">${escapeHtml(org.organization_name)}</div>
                            <div class="org-meta">${escapeHtml(org.core_work_location || "Location not provided")}</div>
                            <div class="org-meta">${orgUrlMarkup(org)}</div>
                        </div>
                    </div>
                    <span class="badge ${escapeHtml(org.status)}">${escapeHtml(org.status)}</span>
                </div>
                <div class="org-metrics">
                    <div class="mini-stat"><span>Nodal officers</span><strong>${numberText(org.nodalCount)}</strong></div>
                    <div class="mini-stat"><span>Employees</span><strong>${numberText(org.employeeCount)}</strong></div>
                    <div class="mini-stat"><span>NWPP target</span><strong>${numberText(org.target_nwpp_bags)}</strong></div>
                    <div class="mini-stat"><span>Achieved</span><strong>${numberText(org.nwppAchieved)}</strong></div>
                </div>
                <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
                <div class="progress-copy"><span>${progress}% of target</span><span>${numberText(org.garmentsAchieved)} garments</span></div>
                <div class="card-actions">
                    <button class="primary-button" type="button" data-org-view="reports" data-org-id="${escapeHtml(org.id)}">
                        <i class="fa-solid fa-chart-line"></i> Analytics
                    </button>
                    <button class="secondary-button" type="button" data-org-view="people" data-org-id="${escapeHtml(org.id)}">
                        <i class="fa-solid fa-users"></i> Employees &amp; status
                    </button>
                    <button class="secondary-button" type="button" data-edit-organisation="${escapeHtml(org.id)}">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    ${org.status === "approved" ? `
                        <button class="danger-button" type="button" data-org-status="rejected" data-org-id="${escapeHtml(org.id)}">
                            <i class="fa-solid fa-ban"></i> Revoke access
                        </button>
                    ` : ""}
                    <button class="danger-button" type="button" data-delete-organisation="${escapeHtml(org.id)}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </article>
        `;
    }).join("")}</div>`;
}
