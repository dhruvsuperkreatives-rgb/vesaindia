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

function formatParticipantBreakdown(breakdown) {
    const parts = [];
    if (breakdown.employee > 0) {
        parts.push(`${breakdown.employee} employee${breakdown.employee > 1 ? 's' : ''}`);
    }
    if (breakdown.nodal > 0) {
        parts.push(`${breakdown.nodal} nodal officer${breakdown.nodal > 1 ? 's' : ''}`);
    }
    if (breakdown.head > 0) {
        parts.push(`${breakdown.head} org head${breakdown.head > 1 ? 's' : ''}`);
    }
    if (parts.length === 0) return "0 employees participated";
    return parts.join(", ") + " participated";
}

function formatRegistrationType(type) {
    const map = {
        government_state: "Government State",
        government_central: "Government Central",
        corporate: "Corporate Entity",
        educational: "Educational Institution",
        ngo_civil_group: "NGO / Civil Group",
        other: "Other"
    };
    return map[type] || type || "Unknown type";
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

    const nwppProgram = model.programs?.find((p) => p.slug === "nwpp_bag");
    const garmentProgram = model.programs?.find((p) => p.slug === "garment");
    const diaryProgram = model.programs?.find((p) => p.slug === "diary");

    container.innerHTML = `<div class="organisations-grid">${organisations.map((org) => {
        const participantCount = Number(org.employeeCount || 0) + Number(org.nodalCount || 0);
        const nwppTargetPer = nwppProgram ? Number(nwppProgram.target_per_participant || 0) : 10;
        const targetNWPP = participantCount * nwppTargetPer;
        const nwppProgress = progressPercent(org.nwppAchieved, targetNWPP);

        const garmentTargetPer = garmentProgram && Number(garmentProgram.target_per_participant) > 0 
            ? Number(garmentProgram.target_per_participant) 
            : 1;
        const targetGarments = participantCount * garmentTargetPer;
        const garmentProgress = progressPercent(org.garmentsAchieved, targetGarments);

        const diaryTargetPer = diaryProgram && Number(diaryProgram.target_per_participant) > 0 
            ? Number(diaryProgram.target_per_participant) 
            : 1;
        const targetDiaries = participantCount * diaryTargetPer;
        const diaryProgress = progressPercent(org.diariesAchieved, targetDiaries);

        const headFullName = [org.organization_head_first_name, org.organization_head_middle_name, org.organization_head_last_name].filter(Boolean).join(" ");

        const showNwpp = !org.selectedProgramSlugs || org.selectedProgramSlugs.length === 0 || org.selectedProgramSlugs.includes("nwpp_bag");
        const showGarments = !org.selectedProgramSlugs || org.selectedProgramSlugs.length === 0 || org.selectedProgramSlugs.includes("garment");
        const showDiaries = !org.selectedProgramSlugs || org.selectedProgramSlugs.length === 0 || org.selectedProgramSlugs.includes("diary");

        return `
            <article class="organisation-card">
                <div class="org-heading">
                    <div class="org-identity">
                        <div class="org-logo">${logoMarkup(org)}</div>
                        <div>
                            <div class="org-name">${escapeHtml(org.organization_name)}</div>
                            <div class="org-type-badge">${escapeHtml(formatRegistrationType(org.registration_type))}</div>
                            <div class="org-meta">${escapeHtml(org.core_work_location || "Location not provided")}</div>
                            <div class="org-meta">${orgUrlMarkup(org)}</div>
                        </div>
                    </div>
                    <span class="badge ${escapeHtml(org.status)}">${escapeHtml(org.status)}</span>
                </div>
                <div class="org-metrics" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
                    <div class="mini-stat"><span>Nodal officers</span><strong>${numberText(org.nodalCount)}</strong></div>
                    <div class="mini-stat"><span>Employees</span><strong>${numberText(org.employeeCount)}</strong></div>
                </div>
                <div style="margin-top: 14px; border-top: 1px dashed var(--line); padding-top: 10px; font-size: 13px; color: var(--ink);">
                    <div style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Org Head Contact</div>
                    <div style="font-weight: 700;">${escapeHtml(headFullName || "---")}</div>
                    <div style="margin-top: 2px;"><i class="fa-solid fa-phone" style="font-size: 11px; margin-right: 6px; color: var(--muted);"></i>${escapeHtml(org.organization_head_mobile || "---")}</div>
                    <div><i class="fa-solid fa-envelope" style="font-size: 11px; margin-right: 6px; color: var(--muted);"></i>${escapeHtml(org.organization_head_email || "---")}</div>
                </div>
                <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                    ${showNwpp ? `
                    <div style="background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 750; color: var(--green); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">NWPP Bags</div>
                        <div style="font-size: 15px; font-weight: 800; color: var(--ink);">${numberText(org.nwppAchieved)} / ${numberText(targetNWPP)}</div>
                        <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 600;">${formatParticipantBreakdown(org.nwppBreakdown)}</div>
                    </div>` : ""}
                    ${showGarments ? `
                    <div style="background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 750; color: var(--blue); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Garments</div>
                        <div style="font-size: 15px; font-weight: 800; color: var(--ink);">${numberText(org.garmentsAchieved)} / ${numberText(targetGarments)}</div>
                        <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 600;">${formatParticipantBreakdown(org.garmentsBreakdown)}</div>
                    </div>` : ""}
                    ${showDiaries ? `
                    <div style="background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 750; color: #a0522d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Diaries</div>
                        <div style="font-size: 15px; font-weight: 800; color: var(--ink);">${numberText(org.diariesAchieved)} / ${numberText(targetDiaries)}</div>
                        <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 600;">${formatParticipantBreakdown(org.diariesBreakdown)}</div>
                    </div>` : ""}
                </div>
                <div class="card-actions">
                    <button class="primary-button" type="button" data-org-view="reports" data-org-id="${escapeHtml(org.id)}">
                        <i class="fa-solid fa-chart-line"></i> Analytics
                    </button>
                    <button class="secondary-button" type="button" data-org-view="people" data-org-id="${escapeHtml(org.id)}">
                        <i class="fa-solid fa-users"></i> Employees &amp; status
                    </button>
                    <a class="secondary-button" href="organisation-details.html?id=${escapeHtml(org.id)}" style="text-decoration: none;">
                        <i class="fa-solid fa-eye"></i> View Details
                    </a>
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
