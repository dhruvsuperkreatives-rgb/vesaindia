import { emptyState, escapeHtml, numberText } from "./utils.js";

// Impact Multipliers (as shown in the reference images)
const MULTIPLIERS = {
    supBags: 100,
    plasticKg: 0.25,
    crudeOilKg: 0.44,
    waterLitres: 45,
    energyKwh: 3.75,
    co2Kg: 1.5,
    trees: 0.075
};

const GARMENT_MULTIPLIERS = {
    divertedKg: 0.7,
    waterLitres: 7500,
    energyKwh: 25,
    co2Kg: 25,
    trees: 1.2
};

const DIARY_MULTIPLIERS = {
    pages: 384,
    notebooks: 8,
    waterLitres: 40.5,
    energyKwh: 3,
    co2Kg: 1.35,
    trees: 0.015
};

let activeTab = "nwpp";

export function renderImpact(container, model, search = "") {
    const organisations = model.organisations || [];
    const totalOrgs = organisations.length;
    const totalNWPP = organisations.reduce((sum, org) => sum + (org.nwppAchieved || 0), 0);
    const totalTarget = organisations.reduce((sum, org) => sum + (org.target_nwpp_bags || 0), 0);
    const totalGarments = organisations.reduce((sum, org) => sum + (org.garmentsAchieved || 0), 0);
    const totalDiaries = organisations.reduce((sum, org) => sum + (org.diariesAchieved || 0), 0);

    // Calculate total NWPP impact
    const supAvoided = totalNWPP * MULTIPLIERS.supBags;
    const plasticPrevented = totalNWPP * MULTIPLIERS.plasticKg;
    const crudeOilSaved = totalNWPP * MULTIPLIERS.crudeOilKg;
    const waterSaved = totalNWPP * MULTIPLIERS.waterLitres;
    const energySaved = totalNWPP * MULTIPLIERS.energyKwh;
    const co2Reduced = totalNWPP * MULTIPLIERS.co2Kg;
    const treesPreserved = totalNWPP * MULTIPLIERS.trees;

    // Calculate total Garment impact
    const garmentWasteDiverted = totalGarments * GARMENT_MULTIPLIERS.divertedKg;
    const garmentWaterPreserved = totalGarments * GARMENT_MULTIPLIERS.waterLitres;
    const garmentEnergyPreserved = totalGarments * GARMENT_MULTIPLIERS.energyKwh;
    const garmentCo2Extended = totalGarments * GARMENT_MULTIPLIERS.co2Kg;
    const garmentTreesPreserved = totalGarments * GARMENT_MULTIPLIERS.trees;

    // Calculate total Diary impact
    const diaryPages = totalDiaries * DIARY_MULTIPLIERS.pages;
    const diaryNotebooks = totalDiaries * DIARY_MULTIPLIERS.notebooks;
    const diaryWaterSaved = totalDiaries * DIARY_MULTIPLIERS.waterLitres;
    const diaryEnergySaved = totalDiaries * DIARY_MULTIPLIERS.energyKwh;
    const diaryCo2Avoided = totalDiaries * DIARY_MULTIPLIERS.co2Kg;
    const diaryTreesPreserved = totalDiaries * DIARY_MULTIPLIERS.trees;

    // Filter organizations for table view
    const term = search.trim().toLowerCase();
    const filteredOrgs = organisations.filter((org) => (
        !term || String(org.organization_name || "").toLowerCase().includes(term)
    ));

    // Get Top 5 organisations for the bar chart
    const topOrgs = [...organisations]
        .sort((a, b) => (b.nwppAchieved || 0) - (a.nwppAchieved || 0))
        .slice(0, 5);
    const maxAchieved = Math.max(...topOrgs.map(o => o.nwppAchieved || 0), 1);

    // Donut chart calculation
    const overallPct = totalTarget > 0 ? Math.round((totalNWPP / totalTarget) * 100) : 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, overallPct) / 100) * circumference;

    // Active tab styles
    const nwppStyle = activeTab === "nwpp" ? "border: 2px solid var(--green); box-shadow: 0 4px 20px rgba(47, 143, 107, 0.15); transform: translateY(-2px);" : "cursor: pointer;";
    const garmentStyle = activeTab === "garments" ? "border: 2px solid var(--blue); box-shadow: 0 4px 20px rgba(47, 111, 237, 0.15); transform: translateY(-2px);" : "cursor: pointer;";
    const diaryStyle = activeTab === "diaries" ? "border: 2px solid #a0522d; box-shadow: 0 4px 20px rgba(160, 82, 45, 0.15); transform: translateY(-2px);" : "cursor: pointer;";

    container.innerHTML = `
        <!-- Top Summary Cards -->
        <div class="stats-grid" style="grid-template-columns: repeat(4, minmax(0, 1fr));">
            <article class="stat-card" style="transition: all 0.2s ease;">
                <div class="stat-label">Total Organisations</div>
                <div class="stat-value">${numberText(totalOrgs)}</div>
                <div class="stat-detail">Registered and active</div>
            </article>
            <article class="stat-card" data-tab="nwpp" style="${nwppStyle} transition: all 0.2s ease;">
                <div class="stat-label">Total NWPP Bags</div>
                <div class="stat-value" style="color: var(--green);">${numberText(totalNWPP)}</div>
                <div class="stat-detail">Bags contributed &rarr;</div>
            </article>
            <article class="stat-card" data-tab="garments" style="${garmentStyle} transition: all 0.2s ease;">
                <div class="stat-label">Total Garments</div>
                <div class="stat-value" style="color: var(--blue);">${numberText(totalGarments)}</div>
                <div class="stat-detail">Items donated &rarr;</div>
            </article>
            <article class="stat-card" data-tab="diaries" style="${diaryStyle} transition: all 0.2s ease;">
                <div class="stat-label">Total Diaries</div>
                <div class="stat-value" style="color: #a0522d;">${numberText(totalDiaries)}</div>
                <div class="stat-detail">Diaries contributed &rarr;</div>
            </article>
        </div>

        <!-- Environmental Impact NWPP Section -->
        <div id="nwppImpactPanel" class="impact-graphics-section card ${activeTab === "nwpp" ? "" : "hidden"}" style="margin-top: 24px; padding: 24px;">
            <div class="impact-section-header" style="text-align: center; margin-bottom: 24px;">
                <span class="eyebrow" style="font-size: 13px;">Bag achievements</span>
                <h3 style="font-size: 22px; margin-top: 4px; color: var(--green);">ECOLOGICAL IMPACT OF NWPP BAGS</h3>
            </div>
            
            <div class="impact-grid" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-bottom: 24px;">
                <div class="impact-tile">
                    <div class="impact-icon-wrap blue">
                        <i class="fa-solid fa-bag-shopping"></i>
                    </div>
                    <div class="impact-value">${numberText(supAvoided)}</div>
                    <div class="impact-label">SUP Bags Eliminated</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap green">
                        <i class="fa-solid fa-leaf"></i>
                    </div>
                    <div class="impact-value">${numberText(plasticPrevented.toFixed(2))} kg</div>
                    <div class="impact-label">Plastic Prevented</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap orange">
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                    <div class="impact-value">${numberText(crudeOilSaved.toFixed(2))} kg</div>
                    <div class="impact-label">Crude Oil Saved</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap lightblue">
                        <i class="fa-solid fa-faucet-drip"></i>
                    </div>
                    <div class="impact-value">${numberText(waterSaved)} Litres</div>
                    <div class="impact-label">Water Saved</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap purple">
                        <i class="fa-solid fa-lightbulb"></i>
                    </div>
                    <div class="impact-value">${numberText(energySaved.toFixed(2))} kWh</div>
                    <div class="impact-label">Energy Saved</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap pink">
                        <i class="fa-solid fa-cloud"></i>
                    </div>
                    <div class="impact-value">${numberText(co2Reduced.toFixed(2))} kg</div>
                    <div class="impact-label">CO<sub>2</sub> Reduced</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap red">
                        <i class="fa-solid fa-heart"></i>
                    </div>
                    <div class="impact-value">Active</div>
                    <div class="impact-label">Supports Livelihoods</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap teal">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="impact-value">Enabled</div>
                    <div class="impact-label">Creates Community Impact</div>
                </div>
            </div>

            <!-- Tree Equivalence Block NWPP -->
            <div class="tree-equivalence-block" style="border: 2px solid #cfe5da; border-radius: 12px; padding: 20px; background: #f0faf5; display: flex; align-items: center; gap: 24px;">
                <div class="tree-icon-large" style="font-size: 48px; color: var(--green); line-height: 1;">
                    <i class="fa-solid fa-tree"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0; text-transform: uppercase; font-size: 13px; letter-spacing: 0.05em; color: var(--green);">Tree Equivalence (Carbon Sequestration)</h4>
                    <div style="display: flex; align-items: baseline; gap: 10px; margin-top: 6px;">
                        <span style="font-size: 32px; font-weight: 800; color: var(--ink);">${numberText(treesPreserved.toFixed(3))} Trees</span>
                        <span style="color: var(--muted); font-size: 14px; font-weight: 500;">Equivalent Preserved</span>
                    </div>
                </div>
                <div class="tree-equivalence-desc" style="max-width: 320px; font-size: 13px; color: #335c4c; border-left: 1px solid #cfe5da; padding-left: 20px;">
                    1 NWPP Bag helps preserve the equivalent of <strong>0.075 trees</strong> through carbon sequestration.
                </div>
            </div>
        </div>

        <!-- Environmental Impact Garment Section -->
        <div id="garmentsImpactPanel" class="impact-graphics-section card ${activeTab === "garments" ? "" : "hidden"}" style="margin-top: 24px; padding: 24px;">
            <div class="impact-section-header" style="text-align: center; margin-bottom: 24px;">
                <span class="eyebrow" style="font-size: 13px; color: var(--blue);">Upcycling achievements</span>
                <h3 style="font-size: 22px; margin-top: 4px; color: var(--blue);">ECOLOGICAL IMPACT OF GARMENTS</h3>
            </div>
            
            <div class="impact-grid" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-bottom: 24px;">
                <div class="impact-tile">
                    <div class="impact-icon-wrap blue">
                        <i class="fa-solid fa-shirt"></i>
                    </div>
                    <div class="impact-value">${numberText(totalGarments)}</div>
                    <div class="impact-label">Garments Upcycled</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap green">
                        <i class="fa-solid fa-recycle"></i>
                    </div>
                    <div class="impact-value">${numberText(garmentWasteDiverted.toFixed(2))} kg</div>
                    <div class="impact-label">Textile Waste Diverted</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap lightblue">
                        <i class="fa-solid fa-water"></i>
                    </div>
                    <div class="impact-value">${numberText(garmentWaterPreserved)} Litres</div>
                    <div class="impact-label">Embedded Water Preserved</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap orange">
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <div class="impact-value">${numberText(garmentEnergyPreserved.toFixed(2))} kWh</div>
                    <div class="impact-label">Embedded Energy Preserved</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap pink">
                        <i class="fa-solid fa-cloud-sun"></i>
                    </div>
                    <div class="impact-value">${numberText(garmentCo2Extended.toFixed(2))} kg</div>
                    <div class="impact-label">CO<sub>2</sub>e Impact Extended</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap teal">
                        <i class="fa-solid fa-bag-shopping"></i>
                    </div>
                    <div class="impact-value">${numberText(totalGarments)}</div>
                    <div class="impact-label">Utility Bags Created</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap purple">
                        <i class="fa-solid fa-scissors"></i>
                    </div>
                    <div class="impact-value">Enabled</div>
                    <div class="impact-label">Livelihood Opportunity</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap red">
                        <i class="fa-solid fa-hands-holding"></i>
                    </div>
                    <div class="impact-value">Active</div>
                    <div class="impact-label">Circular Economy Support</div>
                </div>
            </div>

            <!-- Tree Equivalence Block Garment -->
            <div class="tree-equivalence-block" style="border: 2px solid #bcd4ef; border-radius: 12px; padding: 20px; background: #f0f7ff; display: flex; align-items: center; gap: 24px;">
                <div class="tree-icon-large" style="font-size: 48px; color: var(--blue); line-height: 1;">
                    <i class="fa-solid fa-tree"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0; text-transform: uppercase; font-size: 13px; letter-spacing: 0.05em; color: var(--blue);">Tree Equivalence (Carbon Sequestration)</h4>
                    <div style="display: flex; align-items: baseline; gap: 10px; margin-top: 6px;">
                        <span style="font-size: 32px; font-weight: 800; color: var(--ink);">${numberText(garmentTreesPreserved.toFixed(3))} Trees</span>
                        <span style="color: var(--muted); font-size: 14px; font-weight: 500;">Equivalent Preserved</span>
                    </div>
                </div>
                <div class="tree-equivalence-desc" style="max-width: 320px; font-size: 13px; color: #315a91; border-left: 1px solid #bcd4ef; padding-left: 20px;">
                    1 Upcycled Garment helps preserve the equivalent of <strong>1.2 trees</strong> through carbon sequestration.
                </div>
            </div>
        </div>

        <!-- Environmental Impact Diary Section -->
        <div id="diariesImpactPanel" class="impact-graphics-section card ${activeTab === "diaries" ? "" : "hidden"}" style="margin-top: 24px; padding: 24px;">
            <div class="impact-section-header" style="text-align: center; margin-bottom: 24px;">
                <span class="eyebrow" style="font-size: 13px; color: #a0522d;">Stationery achievements</span>
                <h3 style="font-size: 22px; margin-top: 4px; color: #a0522d;">ECOLOGICAL IMPACT OF DIARIES</h3>
            </div>
            
            <div class="impact-grid" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-bottom: 24px;">
                <div class="impact-tile">
                    <div class="impact-icon-wrap" style="color: #a0522d; background: #faf0e6;">
                        <i class="fa-solid fa-book"></i>
                    </div>
                    <div class="impact-value">${numberText(totalDiaries)}</div>
                    <div class="impact-label">Diaries Contributed</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap blue">
                        <i class="fa-solid fa-file-lines"></i>
                    </div>
                    <div class="impact-value">${numberText(diaryPages)}</div>
                    <div class="impact-label">Pages Recovered</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap green">
                        <i class="fa-solid fa-graduation-cap"></i>
                    </div>
                    <div class="impact-value">${numberText(diaryNotebooks)}</div>
                    <div class="impact-label">Notebooks Produced</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap lightblue">
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                    <div class="impact-value">${numberText(diaryWaterSaved)} Litres</div>
                    <div class="impact-label">Water Preserved</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap orange">
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <div class="impact-value">${numberText(diaryEnergySaved.toFixed(1))} kWh</div>
                    <div class="impact-label">Energy Preserved</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap pink">
                        <i class="fa-solid fa-cloud"></i>
                    </div>
                    <div class="impact-value">${numberText(diaryCo2Avoided.toFixed(1))} kg</div>
                    <div class="impact-label">CO<sub>2</sub> Impact Avoided</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap red">
                        <i class="fa-solid fa-handshake-angle"></i>
                    </div>
                    <div class="impact-value">Enabled</div>
                    <div class="impact-label">Supports Livelihoods</div>
                </div>
                <div class="impact-tile">
                    <div class="impact-icon-wrap teal">
                        <i class="fa-solid fa-pen-nib"></i>
                    </div>
                    <div class="impact-value">Active</div>
                    <div class="impact-label">Creates Educational Change</div>
                </div>
            </div>

            <!-- Tree Equivalence Block Diary -->
            <div class="tree-equivalence-block" style="border: 2px solid #e5d3c3; border-radius: 12px; padding: 20px; background: #faf5f0; display: flex; align-items: center; gap: 24px;">
                <div class="tree-icon-large" style="font-size: 48px; color: #a0522d; line-height: 1;">
                    <i class="fa-solid fa-tree"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0; text-transform: uppercase; font-size: 13px; letter-spacing: 0.05em; color: #a0522d;">Tree Equivalence (Carbon Sequestration)</h4>
                    <div style="display: flex; align-items: baseline; gap: 10px; margin-top: 6px;">
                        <span style="font-size: 32px; font-weight: 800; color: var(--ink);">${numberText(diaryTreesPreserved.toFixed(3))} Trees</span>
                        <span style="color: var(--muted); font-size: 14px; font-weight: 500;">Equivalent Preserved</span>
                    </div>
                </div>
                <div class="tree-equivalence-desc" style="max-width: 320px; font-size: 13px; color: #8b5a2b; border-left: 1px solid #e5d3c3; padding-left: 20px;">
                    100 Diaries help preserve the equivalent of <strong>1-2 trees (1.5 avg)</strong> through carbon sequestration.
                </div>
            </div>
        </div>

        <!-- Visual Charts Section -->
        <div class="content-grid" style="margin-top: 24px;">
            <article class="card" style="padding: 20px;">
                <h3 style="margin-top: 0; margin-bottom: 18px; color: var(--ink); font-size: 16px;">Top Performing Organisations (Bags)</h3>
                <div class="bar-chart-container" style="display: flex; flex-direction: column; gap: 14px;">
                    ${topOrgs.length ? topOrgs.map(org => {
                        const pct = Math.round((org.nwppAchieved / maxAchieved) * 100);
                        return `
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;">
                                    <span style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 70%;">${escapeHtml(org.organization_name)}</span>
                                    <span style="color: var(--green); font-weight: 700;">${numberText(org.nwppAchieved)} bags</span>
                                </div>
                                <div style="height: 10px; background: #e8edf3; border-radius: 999px; overflow: hidden;">
                                    <div style="height: 100%; width: ${pct}%; background: var(--green); border-radius: 999px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                                </div>
                            </div>
                        `;
                    }).join("") : '<div style="color: var(--muted); font-size: 13px;">No data available</div>'}
                </div>
            </article>

            <article class="card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
                <h3 style="margin-top: 0; margin-bottom: 14px; color: var(--ink); font-size: 16px;">Overall Program Goal</h3>
                <div style="display: flex; align-items: center; justify-content: center; gap: 24px; padding: 10px 0; flex-wrap: wrap;">
                    <svg width="120" height="120" viewBox="0 0 120 120" style="transform: rotate(-90deg); flex-shrink: 0;">
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#e8edf3" stroke-width="12"></circle>
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--green)" stroke-width="12"
                            stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
                            stroke-linecap="round" style="transition: stroke-dashoffset 0.8s ease;"></circle>
                    </svg>
                    <div>
                        <div style="font-size: 32px; font-weight: 800; color: var(--green);">${overallPct}%</div>
                        <div style="font-size: 13px; font-weight: 750; color: var(--ink); margin-top: 2px;">Target Achieved</div>
                        <div style="font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.4;">
                            ${numberText(totalNWPP)} of ${numberText(totalTarget)} target bags achieved
                        </div>
                    </div>
                </div>
            </article>
        </div>

        <!-- Organisation Breakdown Section -->
        <div style="margin-top: 28px;">
            ${filteredOrgs.length ? `
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Organisation</th>
                                <th>NWPP Bags</th>
                                <th>Garments Donated</th>
                                <th>Diaries Donated</th>
                                <th>Pages Recovered</th>
                                <th>Notebooks Made</th>
                                <th>Total Trees Preserved</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredOrgs.map((org) => {
                                const orgBags = org.nwppAchieved || 0;
                                const orgGarments = org.garmentsAchieved || 0;
                                const orgDiaries = org.diariesAchieved || 0;
                                const combinedTrees = (orgBags * MULTIPLIERS.trees) + (orgGarments * GARMENT_MULTIPLIERS.trees) + (orgDiaries * DIARY_MULTIPLIERS.trees);
                                return `
                                    <tr>
                                        <td><strong>${escapeHtml(org.organization_name)}</strong></td>
                                        <td>${numberText(orgBags)}</td>
                                        <td>${numberText(orgGarments)}</td>
                                        <td>${numberText(orgDiaries)}</td>
                                        <td>${numberText(orgDiaries * DIARY_MULTIPLIERS.pages)}</td>
                                        <td>${numberText(orgDiaries * DIARY_MULTIPLIERS.notebooks)}</td>
                                        <td>${numberText(combinedTrees.toFixed(3))}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            ` : emptyState("fa-building", "No organisations found", "No organizations match your search term.")}
        </div>
    `;

    // Delegated container click registration
    if (!container.dataset.listenerBound) {
        container.dataset.listenerBound = "true";
        container.addEventListener("click", (event) => {
            const tabCard = event.target.closest("[data-tab]");
            if (tabCard) {
                activeTab = tabCard.dataset.tab;
                const searchVal = document.getElementById("impactSearch")?.value || "";
                renderImpact(container, model, searchVal);
            }
        });
    }
}
