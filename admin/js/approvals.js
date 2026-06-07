import { dateText, emptyState, escapeHtml, numberText, organisationInitial } from "./utils.js";

function logoMarkup(org) {
    return org.company_logo_url
        ? `<img src="${escapeHtml(org.company_logo_url)}" alt="">`
        : escapeHtml(organisationInitial(org.organization_name));
}

export function renderApprovals(container, model) {
    const pending = model.organisations.filter((org) => org.status === "pending");
    if (!pending.length) {
        container.innerHTML = emptyState("fa-circle-check", "No pending approvals", "All organisation registrations have been reviewed.");
        return;
    }

    container.innerHTML = `<div class="approval-list">${pending.map((org) => `
        <article class="organisation-card">
            <div class="org-heading">
                <div class="org-identity">
                    <div class="org-logo">${logoMarkup(org)}</div>
                    <div>
                        <div class="org-name">${escapeHtml(org.organization_name)}</div>
                        <div class="org-meta">${escapeHtml(org.registration_type || "Organisation")} - ${escapeHtml(org.core_work_location || "Location not provided")}</div>
                        <div class="org-meta">Submitted ${dateText(org.created_at)}</div>
                    </div>
                </div>
                <span class="badge">Pending</span>
            </div>
            <div class="org-metrics">
                <div class="mini-stat"><span>Participants</span><strong>${numberText(org.estimated_participants)}</strong></div>
                <div class="mini-stat"><span>NWPP target</span><strong>${numberText(org.target_nwpp_bags)}</strong></div>
                <div class="mini-stat"><span>Contact</span><strong>${escapeHtml(org.nodal_officer_name || "-")}</strong></div>
                <div class="mini-stat"><span>Scope</span><strong>${escapeHtml(org.implementation_scope || "-")}</strong></div>
            </div>
            <div class="card-actions">
                <button class="primary-button" type="button" data-org-status="approved" data-org-id="${escapeHtml(org.id)}">
                    <i class="fa-solid fa-check"></i> Approve
                </button>
                <button class="danger-button" type="button" data-org-status="rejected" data-org-id="${escapeHtml(org.id)}">
                    <i class="fa-solid fa-xmark"></i> Reject
                </button>
            </div>
        </article>
    `).join("")}</div>`;
}
