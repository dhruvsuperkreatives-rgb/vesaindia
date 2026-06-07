import { dateTimeText, escapeHtml, numberText } from "./utils.js";

export function renderHome(container, model) {
    const organisations = model.organisations;
    const pending = organisations.filter((org) => org.status === "pending").length;
    const approved = organisations.filter((org) => org.status === "approved").length;
    const revoked = organisations.filter((org) => org.status === "rejected").length;
    const bags = organisations.reduce((sum, org) => sum + org.nwppAchieved, 0);
    const nodal = organisations.reduce((sum, org) => sum + org.nodalCount, 0);
    const employees = organisations.reduce((sum, org) => sum + org.employeeCount, 0);
    const recent = [
        ...model.contributions.map((item) => ({ ...item, kind: "NWPP", amount: item.bags_count })),
        ...model.garments.map((item) => ({ ...item, kind: "Garments", amount: item.garment_count }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
    const names = new Map(organisations.map((org) => [org.id, org.organization_name]));

    container.innerHTML = `
        <div class="stats-grid">
            <article class="stat-card"><div class="stat-label">Organisations</div><div class="stat-value">${numberText(organisations.length)}</div><div class="stat-detail">${numberText(approved)} approved</div></article>
            <article class="stat-card"><div class="stat-label">Pending approvals</div><div class="stat-value">${numberText(pending)}</div><div class="stat-detail">Waiting for review</div></article>
            <article class="stat-card"><div class="stat-label">NWPP achieved</div><div class="stat-value">${numberText(bags)}</div><div class="stat-detail">Bags contributed</div></article>
            <article class="stat-card"><div class="stat-label">People</div><div class="stat-value">${numberText(nodal + employees)}</div><div class="stat-detail">${numberText(nodal)} nodal, ${numberText(employees)} employees</div></article>
        </div>
        <div class="content-grid">
            <article class="card">
                <h3>Recent contribution activity</h3>
                <ul class="activity-list">
                    ${recent.length ? recent.map((item) => `
                        <li class="activity-row">
                            <span>
                                <strong>${escapeHtml(names.get(item.organization_registration_id) || "Unknown organisation")}</strong>
                                <small>${escapeHtml(item.kind)} - ${dateTimeText(item.created_at)}</small>
                            </span>
                            <strong>${numberText(item.amount)}</strong>
                        </li>
                    `).join("") : '<li class="activity-row"><span><strong>No contribution activity yet</strong><small>New entries will appear here.</small></span></li>'}
                </ul>
            </article>
            <article class="card">
                <h3>Access status</h3>
                <ul class="status-list">
                    <li class="status-row"><span>Approved</span><span class="badge approved">${numberText(approved)}</span></li>
                    <li class="status-row"><span>Pending</span><span class="badge">${numberText(pending)}</span></li>
                    <li class="status-row"><span>Revoked / rejected</span><span class="badge rejected">${numberText(revoked)}</span></li>
                    <li class="status-row"><span>Total garments</span><strong>${numberText(organisations.reduce((sum, org) => sum + org.garmentsAchieved, 0))}</strong></li>
                </ul>
            </article>
        </div>
    `;
}
