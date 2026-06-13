import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Fetch data from database
        const [orgsRes, nwppRes, garmentsRes, profilesRes] = await Promise.all([
            supabase.from("organization_registrations").select("*"),
            supabase.from("nwpp_contributions").select("bags_count, created_at, organization_registration_id"),
            supabase.from("garment_contributions").select("garment_count, created_at, organization_registration_id"),
            supabase.from("profiles").select("id")
        ]);

        if (orgsRes.error) throw orgsRes.error;
        if (nwppRes.error) throw nwppRes.error;
        if (garmentsRes.error) throw garmentsRes.error;
        if (profilesRes.error) throw profilesRes.error;

        const organisations = orgsRes.data || [];
        const nwppContributions = nwppRes.data || [];
        const garmentContributions = garmentsRes.data || [];
        const profiles = profilesRes.data || [];

        // 1. Calculate Core Metrics
        const totalBags = nwppContributions.reduce((sum, c) => sum + (c.bags_count || 0), 0);
        const totalGarments = garmentContributions.reduce((sum, c) => sum + (c.garment_count || 0), 0);
        
        // Multipliers
        const supBagsMultiplier = 100; // 1 NWPP bag avoids 100 SUP bags
        const savingPerBag = 0.15; // Rs 0.15 saved per SUP bag
        const bagsCo2Multiplier = 1.5; // 1.5 kg CO2 per bag
        const garmentCo2Multiplier = 25.0; // 25 kg CO2 per garment upcycled

        const supBagsAvoided = totalBags * supBagsMultiplier;
        const totalSavings = supBagsAvoided * savingPerBag;
        
        const totalVendors = organisations.reduce((sum, org) => sum + (org.participating_locations || 0), 0);
        const skilledWorkers = profiles.length;

        // CO2 Avoided (in tonnes)
        const co2AvoidedKg = (totalBags * bagsCo2Multiplier) + (totalGarments * garmentCo2Multiplier);
        const co2AvoidedTonnes = co2AvoidedKg / 1000;

        // Update DOM elements
        document.getElementById("kpiBags").textContent = new Intl.NumberFormat("en-IN").format(supBagsAvoided);
        document.getElementById("kpiBagsSub").textContent = `from ${new Intl.NumberFormat("en-IN").format(totalBags)} NWPP bags`;

        document.getElementById("kpiVendors").textContent = new Intl.NumberFormat("en-IN").format(totalVendors);

        document.getElementById("kpiSavings").textContent = `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(totalSavings)}`;
        document.getElementById("kpiSavingsSub").textContent = `Based on ₹0.15 saving / bag`;

        document.getElementById("kpiWorkers").textContent = new Intl.NumberFormat("en-IN").format(skilledWorkers);
        document.getElementById("kpiCO2").textContent = `${co2AvoidedTonnes.toFixed(2)} t`;

        // 2. Update Progress Bars
        const targets = {
            sup: 50000,
            vendors: 5000,
            co2: 10.0,
            workers: 300,
            orgs: 10
        };

        const progressValues = {
            sup: Math.min(100, Math.round((supBagsAvoided / targets.sup) * 100)),
            vendors: Math.min(100, Math.round((totalVendors / targets.vendors) * 100)),
            co2: Math.min(100, Math.round((co2AvoidedTonnes / targets.co2) * 100)),
            workers: Math.min(100, Math.round((skilledWorkers / targets.workers) * 100)),
            orgs: Math.min(100, Math.round((organisations.length / targets.orgs) * 100))
        };

        const updateProgress = (id, val) => {
            document.getElementById(`progressPct${id}`).textContent = `${val}%`;
            document.getElementById(`progressFill${id}`).style.width = `${val}%`;
        };

        updateProgress("SUP", progressValues.sup);
        updateProgress("Vendors", progressValues.vendors);
        updateProgress("CO2", progressValues.co2);
        updateProgress("Workers", progressValues.workers);
        updateProgress("Orgs", progressValues.orgs);

        // 3. Populate Geographic Reach / Organisations table
        const tableBody = document.getElementById("geographicReachBody");
        if (organisations.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-slate-400 py-4">No organisations registered yet.</td></tr>`;
        } else {
            tableBody.innerHTML = organisations.map(org => `
                <tr>
                    <td class="font-semibold text-slate-900 py-2">${escapeHtml(org.organization_name)}</td>
                    <td class="text-slate-500 py-2">${escapeHtml(org.core_work_location || "Not specified")}</td>
                    <td class="py-2"><span class="status-badge ${org.status === 'approved' ? 'status-active' : org.status === 'pending' ? 'status-pilot' : 'status-planned'}">${escapeHtml(org.status)}</span></td>
                </tr>
            `).join("");
        }

        // 4. Render Chart.js graphs
        renderCharts(nwppContributions, garmentContributions, organisations);

    } catch (err) {
        console.error("Error loading dashboard data:", err);
    }
});

function renderCharts(nwpp, garments, orgs) {
    // A. Chart 1: Contribution Trend (Line Chart)
    const trendCtx = document.getElementById("contributionTrendChart")?.getContext("2d");
    if (trendCtx) {
        // Group contributions chronologically (e.g., by day)
        const datesMap = new Map();
        const allItems = [
            ...nwpp.map(item => ({ date: item.created_at.split("T")[0], type: "bag", val: item.bags_count })),
            ...garments.map(item => ({ date: item.created_at.split("T")[0], type: "garment", val: item.garment_count }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        let cumulativeBags = 0;
        let cumulativeGarments = 0;
        const trendData = [];

        allItems.forEach(item => {
            if (item.type === "bag") cumulativeBags += item.val;
            if (item.type === "garment") cumulativeGarments += item.val;

            trendData.push({
                date: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(item.date)),
                bags: cumulativeBags,
                garments: cumulativeGarments
            });
        });

        // If no data, populate a mock start point
        if (trendData.length === 0) {
            trendData.push({ date: "Start", bags: 0, garments: 0 });
        }

        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: trendData.map(d => d.date),
                datasets: [
                    {
                        label: 'NWPP Bags (Cumulative)',
                        data: trendData.map(d => d.bags),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        tension: 0.3,
                        fill: true,
                        borderWidth: 2.5
                    },
                    {
                        label: 'Garments (Cumulative)',
                        data: trendData.map(d => d.garments),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
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
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: '600' } } }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // B. Chart 2: Organisation Contributions (Bar Chart)
    const orgsCtx = document.getElementById("topOrgsChart")?.getContext("2d");
    if (orgsCtx) {
        // Map organization names
        const namesMap = new Map(orgs.map(o => [o.id, o.organization_name]));
        const orgsDataMap = new Map();

        // Initialize maps
        orgs.forEach(o => {
            orgsDataMap.set(o.id, { name: o.organization_name, bags: 0, garments: 0 });
        });

        nwpp.forEach(item => {
            const entry = orgsDataMap.get(item.organization_registration_id);
            if (entry) entry.bags += item.bags_count;
        });

        garments.forEach(item => {
            const entry = orgsDataMap.get(item.organization_registration_id);
            if (entry) entry.garments += item.garment_count;
        });

        const sortedOrgs = [...orgsDataMap.values()]
            .sort((a, b) => (b.bags + b.garments) - (a.bags + a.garments))
            .slice(0, 5);

        new Chart(orgsCtx, {
            type: 'bar',
            data: {
                labels: sortedOrgs.map(o => o.name),
                datasets: [
                    {
                        label: 'NWPP Bags',
                        data: sortedOrgs.map(o => o.bags),
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'Garments',
                        data: sortedOrgs.map(o => o.garments),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: '600' } } }
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
