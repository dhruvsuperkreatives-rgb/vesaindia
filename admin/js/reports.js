import { emptyState, escapeHtml, numberText } from "./utils.js";

function periodKey(value, grouping) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    if (grouping === "month") {
        return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(date);
    }
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function afterStart(value, start) {
    return !start || new Date(value) >= new Date(`${start}T00:00:00`);
}

export function renderReports(container, model, filters = {}) {
    const grouping = filters.grouping || "day";
    const start = filters.start || "";
    const organizationId = filters.organizationId || "";
    const names = new Map(model.organisations.map((org) => [org.id, org.organization_name]));
    const rows = new Map();

    const add = (item, field, kind) => {
        if (organizationId && item.organization_registration_id !== organizationId) return;
        if (!afterStart(item.created_at, start)) return;
        const period = periodKey(item.created_at, grouping);
        const orgName = names.get(item.organization_registration_id) || "Unknown organisation";
        const key = `${period}|${orgName}`;
        if (!rows.has(key)) rows.set(key, { period, orgName, nwpp: 0, garments: 0, entries: 0 });
        const row = rows.get(key);
        row[kind] += Number(item[field] || 0);
        row.entries += 1;
    };

    model.contributions.forEach((item) => add(item, "bags_count", "nwpp"));
    model.garments.forEach((item) => add(item, "garment_count", "garments"));
    const reportRows = [...rows.values()];

    container.innerHTML = `
        <div class="report-toolbar">
            <label>Organisation
                <select id="reportOrganisation">
                    <option value="">All organisations</option>
                    ${model.organisations.map((org) => `
                        <option value="${escapeHtml(org.id)}" ${organizationId === org.id ? "selected" : ""}>
                            ${escapeHtml(org.organization_name)}
                        </option>
                    `).join("")}
                </select>
            </label>
            <label>Group data by
                <select id="reportGrouping">
                    <option value="day" ${grouping === "day" ? "selected" : ""}>Day</option>
                    <option value="month" ${grouping === "month" ? "selected" : ""}>Month</option>
                </select>
            </label>
            <label>From date
                <input id="reportStartDate" type="date" value="${escapeHtml(start)}">
            </label>
        </div>
        <div class="stats-grid">
            <article class="stat-card"><div class="stat-label">NWPP in report</div><div class="stat-value">${numberText(reportRows.reduce((sum, row) => sum + row.nwpp, 0))}</div></article>
            <article class="stat-card"><div class="stat-label">Garments in report</div><div class="stat-value">${numberText(reportRows.reduce((sum, row) => sum + row.garments, 0))}</div></article>
            <article class="stat-card"><div class="stat-label">Entries</div><div class="stat-value">${numberText(reportRows.reduce((sum, row) => sum + row.entries, 0))}</div></article>
            <article class="stat-card"><div class="stat-label">Periods</div><div class="stat-value">${numberText(new Set(reportRows.map((row) => row.period)).size)}</div></article>
        </div>
        <div style="margin-top:16px">
            ${reportRows.length ? `
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Period</th><th>Organisation</th><th>NWPP bags</th><th>Garments</th><th>Entries</th></tr></thead>
                        <tbody>${reportRows.map((row) => `
                            <tr>
                                <td>${escapeHtml(row.period)}</td>
                                <td>${escapeHtml(row.orgName)}</td>
                                <td>${numberText(row.nwpp)}</td>
                                <td>${numberText(row.garments)}</td>
                                <td>${numberText(row.entries)}</td>
                            </tr>
                        `).join("")}</tbody>
                    </table>
                </div>
            ` : emptyState("fa-chart-column", "No report data", "No contributions match the selected period.")}
        </div>
    `;
}
