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
                <h3 style="margin-top: 0; margin-bottom: 18px; color: var(--ink); font-size: 16px;">Top Performing Organisations Comparison</h3>
                <div style="position: relative; height: 200px; width: 100%;">
                    <canvas id="topOrgsHorizontalBar"></canvas>
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

        <!-- Ecological Radar Comparison Chart -->
        <article class="card" style="padding: 24px; margin-top: 24px; background: white; border: 1px solid var(--line); border-radius: 12px;">
            <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--ink); font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-chart-pie" style="color: var(--blue); font-size: 18px;"></i> Ecological Radar Comparison (Top 3 Organisations)
            </h3>
            <div style="position: relative; height: 280px; width: 100%;">
                <canvas id="impactRadarChart"></canvas>
            </div>
        </article>

        <!-- New Detailed Impact Analytics Row -->
        <div class="content-grid" style="margin-top: 24px;">
            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px;">
                <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--ink); font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-seedling" style="color: var(--green); font-size: 18px;"></i> Cumulative Environmental Savings (Monthly)
                </h3>
                <div style="position: relative; height: 250px; width: 100%;">
                    <canvas id="impactSavingsTrendChart"></canvas>
                </div>
            </article>

            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px;">
                <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--ink); font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-bolt" style="color: var(--orange); font-size: 18px;"></i> Resource Footprint Breakdown (Water & Energy)
                </h3>
                <div style="position: relative; height: 250px; width: 100%;">
                    <canvas id="resourceFootprintPolarChart"></canvas>
                </div>
            </article>
        </div>

        <!-- Top Performing Departments & Employees Leaderboard Section -->
        <div class="content-grid" style="margin-top: 24px;">
            <!-- Top Departments -->
            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px;">
                <h3 style="margin-top: 0; margin-bottom: 18px; color: var(--ink); font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-trophy" style="color: #ffd700; font-size: 18px;"></i> Top Performing Departments
                </h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${(() => {
                        const deptTotalsMap = new Map();
                        const employeeTotalsMap = new Map();
                        const userProfileMap = new Map((model.missionPeople || []).map(p => [p.id, p]));
                        const diaryProgram = (model.programs || []).find((p) => p.slug === "diary");
                        const diaryProgramId = diaryProgram?.id;

                        const getDeptEntry = (userProfile) => {
                            if (!userProfile || !userProfile.department_id) return null;
                            const depId = userProfile.department_id;
                            if (!deptTotalsMap.has(depId)) {
                                deptTotalsMap.set(depId, {
                                    department_name: userProfile.department_name,
                                    organization_name: userProfile.organization_name,
                                    bags: 0,
                                    garments: 0,
                                    diaries: 0,
                                    total: 0
                                });
                            }
                            return deptTotalsMap.get(depId);
                        };

                        (model.contributions || []).forEach(c => {
                            const profile = userProfileMap.get(c.user_id);
                            const bags = Number(c.bags_count || 0);
                            if (profile) {
                                const dept = getDeptEntry(profile);
                                if (dept) {
                                    dept.bags += bags;
                                    dept.total += bags;
                                }
                            }
                        });

                        (model.garments || []).forEach(g => {
                            const profile = userProfileMap.get(g.user_id);
                            const garments = Number(g.garment_count || 0);
                            if (profile) {
                                const dept = getDeptEntry(profile);
                                if (dept) {
                                    dept.garments += garments;
                                    dept.total += garments;
                                }
                            }
                        });

                        (model.programContributions || []).forEach(pc => {
                            const profile = userProfileMap.get(pc.user_id);
                            const qty = Number(pc.quantity || 0);
                            if (profile) {
                                const dept = getDeptEntry(profile);
                                if (dept) {
                                    if (diaryProgramId && pc.program_id === diaryProgramId) {
                                        dept.diaries += qty;
                                    }
                                    dept.total += qty;
                                }
                            }
                        });

                        const topAdminDepts = [...deptTotalsMap.values()]
                            .filter(d => d.total > 0)
                            .sort((a, b) => b.total - a.total)
                            .slice(0, 5);

                        return topAdminDepts.length ? topAdminDepts.map((dept, index) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line); transition: all 0.2s ease;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-weight: 800; font-size: 13px; width: 26px; height: 26px; border-radius: 50%; background: ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e2e8f0'}; color: ${index <= 2 ? '#fff' : 'var(--muted)'}; display: grid; place-items: center; box-shadow: ${index <= 2 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};">${index + 1}</span>
                                    <div>
                                        <strong style="font-size: 13px; color: var(--ink); display: block; font-weight: 700;">${escapeHtml(dept.department_name)}</strong>
                                        <span style="font-size: 11px; color: var(--muted);">${escapeHtml(dept.organization_name)}</span>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <span style="background: #e8f5ef; color: #2f8f6b; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 999px; display: inline-block;">${numberText(dept.total)} items</span>
                                    <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 500;">
                                        ${dept.bags ? `Bags: ${numberText(dept.bags)} · ` : ''}
                                        ${dept.garments ? `Garments: ${numberText(dept.garments)} · ` : ''}
                                        ${dept.diaries ? `Diaries: ${numberText(dept.diaries)}` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join("") : '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 20px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line);">No department contributions logged yet.</div>';
                    })()}
                </div>
            </article>

            <!-- Top Employees -->
            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px;">
                <h3 style="margin-top: 0; margin-bottom: 18px; color: var(--ink); font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-medal" style="color: #ffd700; font-size: 18px;"></i> Top Performing Employees
                </h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${(() => {
                        const employeeTotalsMap = new Map();
                        const userProfileMap = new Map((model.missionPeople || []).map(p => [p.id, p]));
                        const diaryProgram = (model.programs || []).find((p) => p.slug === "diary");
                        const diaryProgramId = diaryProgram?.id;

                        const getEmpEntry = (userProfile) => {
                            if (!userProfile) return null;
                            const uid = userProfile.id;
                            if (!employeeTotalsMap.has(uid)) {
                                employeeTotalsMap.set(uid, {
                                    fullName: [userProfile.first_name, userProfile.middle_name, userProfile.last_name].filter(Boolean).join(" "),
                                    department_name: userProfile.department_name || "Organisation leadership",
                                    organization_name: userProfile.organization_name,
                                    bags: 0,
                                    garments: 0,
                                    diaries: 0,
                                    total: 0
                                });
                            }
                            return employeeTotalsMap.get(uid);
                        };

                        (model.contributions || []).forEach(c => {
                            const profile = userProfileMap.get(c.user_id);
                            const bags = Number(c.bags_count || 0);
                            if (profile) {
                                const emp = getEmpEntry(profile);
                                if (emp) {
                                    emp.bags += bags;
                                    emp.total += bags;
                                }
                            }
                        });

                        (model.garments || []).forEach(g => {
                            const profile = userProfileMap.get(g.user_id);
                            const garments = Number(g.garment_count || 0);
                            if (profile) {
                                const emp = getEmpEntry(profile);
                                if (emp) {
                                    emp.garments += garments;
                                    emp.total += garments;
                                }
                            }
                        });

                        (model.programContributions || []).forEach(pc => {
                            const profile = userProfileMap.get(pc.user_id);
                            const qty = Number(pc.quantity || 0);
                            if (profile) {
                                const emp = getEmpEntry(profile);
                                if (emp) {
                                    if (diaryProgramId && pc.program_id === diaryProgramId) {
                                        emp.diaries += qty;
                                    }
                                    emp.total += qty;
                                }
                            }
                        });

                        const topAdminEmployees = [...employeeTotalsMap.values()]
                            .filter(e => e.total > 0)
                            .sort((a, b) => b.total - a.total)
                            .slice(0, 5);

                        return topAdminEmployees.length ? topAdminEmployees.map((p, index) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line); transition: all 0.2s ease;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-weight: 800; font-size: 13px; width: 26px; height: 26px; border-radius: 50%; background: ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e2e8f0'}; color: ${index <= 2 ? '#fff' : 'var(--muted)'}; display: grid; place-items: center; box-shadow: ${index <= 2 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};">${index + 1}</span>
                                    <div>
                                        <strong style="font-size: 13px; color: var(--ink); display: block; font-weight: 700;">${escapeHtml(p.fullName || "Mission Member")}</strong>
                                        <span style="font-size: 11px; color: var(--muted);">${escapeHtml(p.organization_name)} · Dept: ${escapeHtml(p.department_name)}</span>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <span style="background: #eef4ff; color: #2f6fed; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 999px; display: inline-block;">${numberText(p.total)} items</span>
                                    <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 500;">
                                        ${p.bags ? `Bags: ${numberText(p.bags)} · ` : ''}
                                        ${p.garments ? `Garments: ${numberText(p.garments)} · ` : ''}
                                        ${p.diaries ? `Diaries: ${numberText(p.diaries)}` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join("") : '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 20px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line);">No employee contributions logged yet.</div>';
                    })()}
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

    // Initialize Radar Chart
    setTimeout(() => {
        // Horizontal Bar Chart: Top Organisations bags vs garments
        const topOrgsHorizontalCtx = document.getElementById("topOrgsHorizontalBar")?.getContext("2d");
        if (topOrgsHorizontalCtx) {
            new Chart(topOrgsHorizontalCtx, {
                type: 'bar',
                data: {
                    labels: topOrgs.map(org => org.organization_name),
                    datasets: [
                        {
                            label: 'NWPP Bags',
                            data: topOrgs.map(org => org.nwppAchieved || 0),
                            backgroundColor: '#2f8f6b'
                        },
                        {
                            label: 'Garments',
                            data: topOrgs.map(org => org.garmentsAchieved || 0),
                            backgroundColor: '#2f6fed'
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                    },
                    scales: {
                        x: { stacked: true, beginAtZero: true },
                        y: { stacked: true, grid: { display: false } }
                    }
                }
            });
        }

        const radarOrgs = [...organisations]
            .sort((a, b) => ((b.nwppAchieved || 0) + (b.garmentsAchieved || 0) + (b.diariesAchieved || 0)) - ((a.nwppAchieved || 0) + (a.garmentsAchieved || 0) + (a.diariesAchieved || 0)))
            .slice(0, 3);

        const radarCtx = document.getElementById("impactRadarChart")?.getContext("2d");
        if (radarCtx && radarOrgs.length > 0) {
            new Chart(radarCtx, {
                type: 'radar',
                data: {
                    labels: ['NWPP Bags', 'Garments Donated', 'Diaries Contributed', 'Trees Preserved x10'],
                    datasets: radarOrgs.map((org, index) => {
                        const colors = [
                            { border: '#2f8f6b', bg: 'rgba(47, 143, 107, 0.15)' },
                            { border: '#2f6fed', bg: 'rgba(47, 111, 237, 0.15)' },
                            { border: '#a0522d', bg: 'rgba(160, 82, 45, 0.15)' }
                        ];
                        const c = colors[index % colors.length];
                        const orgBags = org.nwppAchieved || 0;
                        const orgGarments = org.garmentsAchieved || 0;
                        const orgDiaries = org.diariesAchieved || 0;
                        const combinedTrees = (orgBags * MULTIPLIERS.trees) + (orgGarments * GARMENT_MULTIPLIERS.trees) + (orgDiaries * DIARY_MULTIPLIERS.trees);

                        return {
                            label: org.organization_name,
                            data: [orgBags, orgGarments, orgDiaries, Math.round(combinedTrees * 10)],
                            borderColor: c.border,
                            backgroundColor: c.bg,
                            borderWidth: 2.5,
                            pointRadius: 4,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: c.border,
                            pointBorderWidth: 1.5
                        };
                    })
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
                        r: {
                            angleLines: { display: true },
                            suggestedMin: 0,
                            ticks: { font: { size: 9 } }
                        }
                    }
                }
            });
        }

        // Environmental Savings Trend Chart
        const envSavingsCtx = document.getElementById("impactSavingsTrendChart")?.getContext("2d");
        if (envSavingsCtx) {
            const chronologicalContributions = [
                ...(model.contributions || []).map(c => ({ date: c.created_at.split("T")[0], val: c.bags_count, type: 'bags' })),
                ...(model.garments || []).map(g => ({ date: g.created_at.split("T")[0], val: g.garment_count, type: 'garments' }))
            ].sort((a, b) => new Date(a.date) - new Date(b.date));

            let cumulativeCO2 = 0;
            let cumulativeTrees = 0;
            const savingsData = [];

            chronologicalContributions.forEach(item => {
                const bagsVal = item.type === 'bags' ? item.val : 0;
                const garmentVal = item.type === 'garments' ? item.val : 0;
                
                cumulativeCO2 += (bagsVal * MULTIPLIERS.co2Kg) + (garmentVal * GARMENT_MULTIPLIERS.co2Kg);
                cumulativeTrees += (bagsVal * MULTIPLIERS.trees) + (garmentVal * GARMENT_MULTIPLIERS.trees);

                savingsData.push({
                    date: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(item.date)),
                    co2: cumulativeCO2,
                    trees: cumulativeTrees
                });
            });

            if (savingsData.length === 0) {
                savingsData.push({ date: 'Start', co2: 0, trees: 0 });
            }

            new Chart(envSavingsCtx, {
                type: 'line',
                data: {
                    labels: savingsData.map(d => d.date),
                    datasets: [
                        {
                            label: 'CO2 Avoided (kg)',
                            data: savingsData.map(d => d.co2),
                            borderColor: '#e11d48',
                            backgroundColor: 'rgba(225, 29, 72, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2.5
                        },
                        {
                            label: 'Tree Equivalent',
                            data: savingsData.map(d => d.trees),
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10 } }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Resource Footprint Breakdown (Water & Energy) Polar Chart
        const resourcePolarCtx = document.getElementById("resourceFootprintPolarChart")?.getContext("2d");
        if (resourcePolarCtx) {
            new Chart(resourcePolarCtx, {
                type: 'polarArea',
                data: {
                    labels: ['NWPP Water Saved', 'NWPP Energy Saved', 'Garment Water Preserved', 'Garment Energy Preserved', 'Diary Water Saved', 'Diary Energy Saved'],
                    datasets: [{
                        data: [
                            waterSaved,
                            energySaved,
                            garmentWaterPreserved,
                            garmentEnergyPreserved,
                            diaryWaterSaved,
                            diaryEnergySaved
                        ],
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.6)',
                            'rgba(245, 158, 11, 0.6)',
                            'rgba(37, 99, 235, 0.6)',
                            'rgba(217, 119, 6, 0.6)',
                            'rgba(96, 165, 250, 0.6)',
                            'rgba(251, 191, 36, 0.6)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 9 } } }
                    }
                }
            });
        }
    }, 0);
}
