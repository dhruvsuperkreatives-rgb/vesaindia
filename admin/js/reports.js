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
        if (!rows.has(key)) rows.set(key, { period, orgName, nwpp: 0, garments: 0, diaries: 0, entries: 0, timestamp: new Date(item.created_at).getTime() });
        const row = rows.get(key);
        row[kind] += Number(item[field] || 0);
        row.entries += 1;
    };

    model.contributions.forEach((item) => add(item, "bags_count", "nwpp"));
    model.garments.forEach((item) => add(item, "garment_count", "garments"));

    const diaryProgram = model.programs?.find((p) => p.slug === "diary");
    if (diaryProgram && model.programContributions) {
        model.programContributions.forEach((item) => {
            if (item.program_id === diaryProgram.id) {
                add(item, "quantity", "diaries");
            }
        });
    }

    const reportRows = [...rows.values()];
    const sortedRows = [...reportRows].sort((a, b) => a.timestamp - b.timestamp);

    // Chart.js Line Graph HTML Container
    let chartMarkup = "";
    if (sortedRows.length > 0) {
        chartMarkup = `
            <div class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px; margin-bottom: 24px; margin-top: 16px;">
                <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--ink); font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-chart-line" style="color: var(--green); font-size: 16px;"></i> Contribution Trend
                </h3>
                <div style="position: relative; height: 240px; width: 100%;">
                    <canvas id="reportsTrendChart"></canvas>
                </div>
            </div>
        `;
    }

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
        <div class="stats-grid" style="grid-template-columns: repeat(5, minmax(0, 1fr));">
            <article class="stat-card"><div class="stat-label">NWPP in report</div><div class="stat-value">${numberText(reportRows.reduce((sum, row) => sum + row.nwpp, 0))}</div></article>
            <article class="stat-card"><div class="stat-label">Garments in report</div><div class="stat-value">${numberText(reportRows.reduce((sum, row) => sum + row.garments, 0))}</div></article>
            <article class="stat-card"><div class="stat-label">Diaries in report</div><div class="stat-value">${numberText(reportRows.reduce((sum, row) => sum + row.diaries, 0))}</div></article>
            <article class="stat-card"><div class="stat-label">Entries</div><div class="stat-value">${numberText(reportRows.reduce((sum, row) => sum + row.entries, 0))}</div></article>
            <article class="stat-card"><div class="stat-label">Periods</div><div class="stat-value">${numberText(new Set(reportRows.map((row) => row.period)).size)}</div></article>
        </div>
        ${chartMarkup}
        <div style="margin-top:16px">
            ${reportRows.length ? `
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Period</th><th>Organisation</th><th>NWPP bags</th><th>Garments</th><th>Diaries</th><th>Entries</th></tr></thead>
                        <tbody>${reportRows.map((row) => `
                            <tr>
                                <td>${escapeHtml(row.period)}</td>
                                <td>${escapeHtml(row.orgName)}</td>
                                <td>${numberText(row.nwpp)}</td>
                                <td>${numberText(row.garments)}</td>
                                <td>${numberText(row.diaries)}</td>
                                <td>${numberText(row.entries)}</td>
                            </tr>
                        `).join("")}</tbody>
                    </table>
                </div>
            ` : emptyState("fa-chart-column", "No report data", "No contributions match the selected period.")}
        </div>
    `;

    setTimeout(() => {
        const trendCtx = document.getElementById("reportsTrendChart")?.getContext("2d");
        if (trendCtx) {
            new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: sortedRows.map(r => r.period),
                    datasets: [
                        {
                            label: 'NWPP Bags',
                            data: sortedRows.map(r => r.nwpp),
                            borderColor: '#2f8f6b',
                            backgroundColor: 'rgba(47, 143, 107, 0.05)',
                            borderWidth: 3,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4.5,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: '#2f8f6b',
                            pointBorderWidth: 2.5
                        },
                        {
                            label: 'Garments',
                            data: sortedRows.map(r => r.garments),
                            borderColor: '#2f6fed',
                            backgroundColor: 'rgba(47, 111, 237, 0.05)',
                            borderWidth: 3,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4.5,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: '#2f6fed',
                            pointBorderWidth: 2.5
                        },
                        {
                            label: 'Diaries',
                            data: sortedRows.map(r => r.diaries),
                            borderColor: '#a0522d',
                            backgroundColor: 'rgba(160, 82, 45, 0.05)',
                            borderWidth: 3,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4.5,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: '#a0522d',
                            pointBorderWidth: 2.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11, weight: 'bold' }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { font: { size: 10 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 10 } }
                        }
                    }
                }
            });
        }
    }, 0);
}
