import { dateTimeText, escapeHtml, numberText } from "./utils.js";

export function renderHome(container, model) {
    const organisations = model.organisations;
    const pending = organisations.filter((org) => org.status === "pending").length;
    const approved = organisations.filter((org) => org.status === "approved").length;
    const revoked = organisations.filter((org) => org.status === "rejected").length;
    const bags = organisations.reduce((sum, org) => sum + org.nwppAchieved, 0);
    const garments = organisations.reduce((sum, org) => sum + org.garmentsAchieved, 0);
    const diaries = organisations.reduce((sum, org) => sum + org.diariesAchieved, 0);
    const nodal = organisations.reduce((sum, org) => sum + org.nodalCount, 0);
    const employees = organisations.reduce((sum, org) => sum + org.employeeCount, 0);

    const recent = [
        ...model.contributions.map((item) => ({ ...item, kind: "NWPP", amount: item.bags_count })),
        ...model.garments.map((item) => ({ ...item, kind: "Garments", amount: item.garment_count }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
    const names = new Map(organisations.map((org) => [org.id, org.organization_name]));

    // Donut chart calculations for Approval Rate
    const totalOrgs = organisations.length || 1;
    const approvedPct = Math.round((approved / totalOrgs) * 100);

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
                <ul class="activity-list" style="margin-top: 16px;">
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
            <article class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; align-items: center;">
                    <div style="position: relative; height: 160px; width: 160px; margin: 0 auto;">
                        <canvas id="statusPieChart"></canvas>
                    </div>
                    <div>
                        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; font-weight: 800;">Access Status Breakdown</h3>
                        <ul class="status-list" style="margin: 0; padding: 0; list-style: none;">
                            <li style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; font-weight: 600;">
                                <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #2f8f6b; border-radius: 50%;"></span> Approved</span>
                                <strong style="color: var(--ink);">${numberText(approved)}</strong>
                            </li>
                            <li style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; font-weight: 600;">
                                <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #ea580c; border-radius: 50%;"></span> Pending</span>
                                <strong style="color: var(--ink);">${numberText(pending)}</strong>
                            </li>
                            <li style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; font-weight: 600;">
                                <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #dc2626; border-radius: 50%;"></span> Revoked</span>
                                <strong style="color: var(--ink);">${numberText(revoked)}</strong>
                            </li>
                        </ul>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--line); padding-top: 16px;">
                    <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 14px; color: var(--ink); font-weight: 800;">Program contributions comparison</h3>
                    <div style="position: relative; height: 160px; width: 100%;">
                        <canvas id="programBarChart"></canvas>
                    </div>
                </div>
            </article>
        </div>

        <div class="content-grid" style="margin-top: 24px;">
            <article class="card">
                <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-chart-pie" style="color: var(--blue);"></i> Registration Sectors Breakdown
                </h3>
                <div style="position: relative; height: 200px; width: 100%;">
                    <canvas id="sectorDoughnutChart"></canvas>
                </div>
            </article>
            <article class="card">
                <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-chart-line" style="color: var(--green);"></i> Cumulative Growth Trend
                </h3>
                <div style="position: relative; height: 200px; width: 100%;">
                    <canvas id="growthTrendChart"></canvas>
                </div>
            </article>
        </div>

        <div class="card" style="margin-top: 24px; padding: 24px;">
            <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-leaf" style="color: var(--green);"></i> Cumulative Ecological Impact Over Time (CO₂ Avoided)
            </h3>
            <div style="position: relative; height: 260px; width: 100%;">
                <canvas id="ecoImpactOverTimeChart"></canvas>
            </div>
        </div>
    `;

    setTimeout(() => {
        const statusCtx = document.getElementById("statusPieChart")?.getContext("2d");
        if (statusCtx) {
            new Chart(statusCtx, {
                type: 'pie',
                data: {
                    labels: ['Approved', 'Pending', 'Revoked'],
                    datasets: [{
                        data: [approved, pending, revoked],
                        backgroundColor: ['#2f8f6b', '#ea580c', '#dc2626'],
                        borderWidth: 1.5,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        const barCtx = document.getElementById("programBarChart")?.getContext("2d");
        if (barCtx) {
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['NWPP Bags', 'Garments', 'Diaries'],
                    datasets: [{
                        label: 'Total Contributed',
                        data: [bags, garments, diaries],
                        backgroundColor: ['#2f8f6b', '#2f6fed', '#a0522d'],
                        borderRadius: 6,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { font: { size: 10, weight: '500' } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 11, weight: 'bold' } }
                        }
                    }
                }
            });
        }

        // Sector breakdown doughnut chart
        const sectorCounts = {
            'State Govt': organisations.filter(o => o.registration_type === 'government_state').length,
            'Central Govt': organisations.filter(o => o.registration_type === 'government_central').length,
            'Corporate': organisations.filter(o => o.registration_type === 'corporate').length,
            'Educational': organisations.filter(o => o.registration_type === 'educational').length,
            'NGO / Civil': organisations.filter(o => o.registration_type === 'ngo_civil_group').length,
            'Other': organisations.filter(o => o.registration_type === 'other').length
        };

        const sectorCtx = document.getElementById("sectorDoughnutChart")?.getContext("2d");
        if (sectorCtx) {
            new Chart(sectorCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(sectorCounts),
                    datasets: [{
                        data: Object.values(sectorCounts),
                        backgroundColor: ['#1e3a8a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'],
                        borderWidth: 1.5,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { boxWidth: 10, font: { size: 10, weight: '600' } }
                        }
                    }
                }
            });
        }

        // Chronological Cumulative Growth Trend Chart (NWPP Bags & Garments)
        const trendCtx = document.getElementById("growthTrendChart")?.getContext("2d");
        if (trendCtx) {
            const allItems = [
                ...model.contributions.map(c => ({ date: c.created_at.split("T")[0], val: c.bags_count, type: 'bags' })),
                ...model.garments.map(g => ({ date: g.created_at.split("T")[0], val: g.garment_count, type: 'garments' }))
            ].sort((a, b) => new Date(a.date) - new Date(b.date));

            let cumulativeBags = 0;
            let cumulativeGarments = 0;
            const chronologicalData = [];

            allItems.forEach(item => {
                if (item.type === 'bags') cumulativeBags += item.val;
                else if (item.type === 'garments') cumulativeGarments += item.val;

                chronologicalData.push({
                    date: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(item.date)),
                    bags: cumulativeBags,
                    garments: cumulativeGarments
                });
            });

            if (chronologicalData.length === 0) {
                chronologicalData.push({ date: 'No contributions', bags: 0, garments: 0 });
            }

            new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: chronologicalData.map(d => d.date),
                    datasets: [
                        {
                            label: 'NWPP Bags (Cumulative)',
                            data: chronologicalData.map(d => d.bags),
                            borderColor: '#2f8f6b',
                            backgroundColor: 'rgba(47, 143, 107, 0.05)',
                            tension: 0.3,
                            fill: true,
                            borderWidth: 2.5
                        },
                        {
                            label: 'Garments (Cumulative)',
                            data: chronologicalData.map(d => d.garments),
                            borderColor: '#2f6fed',
                            backgroundColor: 'rgba(47, 111, 237, 0.05)',
                            tension: 0.3,
                            fill: true,
                            borderWidth: 2.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: '600' } } }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Cumulative Ecological Impact Over Time (CO2 Avoided)
        const ecoCtx = document.getElementById("ecoImpactOverTimeChart")?.getContext("2d");
        if (ecoCtx) {
            const diaryProgram = model.programs?.find(p => p.slug === 'diary');
            const diaryContributions = diaryProgram && model.programContributions 
                ? model.programContributions.filter(pc => pc.program_id === diaryProgram.id)
                : [];

            const allEcoItems = [
                ...model.contributions.map(c => ({ date: c.created_at.split("T")[0], co2: Number(c.bags_count || 0) * 1.5, type: 'Bags' })),
                ...model.garments.map(g => ({ date: g.created_at.split("T")[0], co2: Number(g.garment_count || 0) * 25.0, type: 'Garments' })),
                ...diaryContributions.map(d => ({ date: d.created_at.split("T")[0], co2: Number(d.quantity || 0) * 1.35, type: 'Diaries' }))
            ].sort((a, b) => new Date(a.date) - new Date(b.date));

            let cumulativeBagsCO2 = 0;
            let cumulativeGarmentsCO2 = 0;
            let cumulativeDiariesCO2 = 0;
            const ecoTrendData = [];

            allEcoItems.forEach(item => {
                if (item.type === 'Bags') cumulativeBagsCO2 += item.co2;
                else if (item.type === 'Garments') cumulativeGarmentsCO2 += item.co2;
                else if (item.type === 'Diaries') cumulativeDiariesCO2 += item.co2;

                ecoTrendData.push({
                    date: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(item.date)),
                    bags: cumulativeBagsCO2,
                    garments: cumulativeGarmentsCO2,
                    diaries: cumulativeDiariesCO2
                });
            });

            if (ecoTrendData.length === 0) {
                ecoTrendData.push({ date: 'Start', bags: 0, garments: 0, diaries: 0 });
            }

            new Chart(ecoCtx, {
                type: 'line',
                data: {
                    labels: ecoTrendData.map(d => d.date),
                    datasets: [
                        {
                            label: 'NWPP Bags CO₂ Offset (kg)',
                            data: ecoTrendData.map(d => d.bags),
                            borderColor: '#2f8f6b',
                            backgroundColor: 'rgba(47, 143, 107, 0.05)',
                            tension: 0.3,
                            fill: true,
                            borderWidth: 2.5
                        },
                        {
                            label: 'Garments CO₂ Offset (kg)',
                            data: ecoTrendData.map(d => d.garments),
                            borderColor: '#2f6fed',
                            backgroundColor: 'rgba(47, 111, 237, 0.05)',
                            tension: 0.3,
                            fill: true,
                            borderWidth: 2.5
                        },
                        {
                            label: 'Diaries CO₂ Offset (kg)',
                            data: ecoTrendData.map(d => d.diaries),
                            borderColor: '#a0522d',
                            backgroundColor: 'rgba(160, 82, 45, 0.05)',
                            tension: 0.3,
                            fill: true,
                            borderWidth: 2.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: '600' } } }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }, 0);
}
