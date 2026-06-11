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

export function renderOrgImpact(container, summary, search = "", programSettings = []) {
    const org = summary.organization || {};
    const orgTotals = summary.org_totals || {};
    const departments = summary.departments || [];
    const programContributions = summary.program_contributions || [];
    
    const totalNWPP = Number(orgTotals.nwpp_bags || 0);
    const targetNWPP = Number(org.target_nwpp_bags || 0);
    const totalGarments = Number(orgTotals.garments || 0);

    // Identify Diary program ID
    const diaryProgram = programSettings.find((p) => p.slug === "diary");
    const diaryProgramId = diaryProgram?.id;

    // Calculate total diaries for organization
    let totalDiaries = 0;
    if (diaryProgramId) {
        totalDiaries = programContributions
            .filter((item) => item.program_id === diaryProgramId)
            .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    }

    // Map diaries by department
    const diariesByDept = new Map();
    if (diaryProgramId) {
        programContributions
            .filter((item) => item.program_id === diaryProgramId && item.department_id)
            .forEach((item) => {
                diariesByDept.set(item.department_id, (diariesByDept.get(item.department_id) || 0) + Number(item.quantity || 0));
            });
    }

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

    // Filter departments for table view
    const term = search.trim().toLowerCase();
    const filteredDepts = departments.filter((dept) => (
        !term || 
        String(dept.department_name || "").toLowerCase().includes(term) ||
        String(dept.nodal_name || "").toLowerCase().includes(term)
    ));

    // Donut chart calculation
    const overallPct = targetNWPP > 0 ? Math.round((totalNWPP / targetNWPP) * 100) : 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, overallPct) / 100) * circumference;

    // Active tab styles
    const nwppStyle = activeTab === "nwpp" ? "border: 2px solid var(--green); box-shadow: 0 4px 15px rgba(47, 143, 107, 0.15); transform: translateY(-2px);" : "cursor: pointer;";
    const garmentStyle = activeTab === "garments" ? "border: 2px solid var(--blue); box-shadow: 0 4px 15px rgba(47, 111, 237, 0.15); transform: translateY(-2px);" : "cursor: pointer;";
    const diaryStyle = activeTab === "diaries" ? "border: 2px solid #a0522d; box-shadow: 0 4px 15px rgba(160, 82, 45, 0.15); transform: translateY(-2px);" : "cursor: pointer;";

    function numberText(value) {
        return new Intl.NumberFormat("en-IN").format(Number(value || 0));
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    container.innerHTML = `
        <!-- Top Summary Cards (Interactive Tabs) -->
        <div class="stats" style="grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 24px;">
            <article class="card" data-tab="nwpp" style="${nwppStyle} transition: all 0.2s ease;">
                <div class="metric-label">Organisation NWPP</div>
                <div class="metric-value" style="color: var(--green);">${numberText(totalNWPP)}</div>
                <div class="metric-unit">bags &rarr;</div>
            </article>
            <article class="card" data-tab="garments" style="${garmentStyle} transition: all 0.2s ease;">
                <div class="metric-label">Organisation Garments</div>
                <div class="metric-value" style="color: var(--blue);">${numberText(totalGarments)}</div>
                <div class="metric-unit">items &rarr;</div>
            </article>
            <article class="card" data-tab="diaries" style="${diaryStyle} transition: all 0.2s ease;">
                <div class="metric-label">Organisation Diaries</div>
                <div class="metric-value" style="color: #a0522d;">${numberText(totalDiaries)}</div>
                <div class="metric-unit">diaries &rarr;</div>
            </article>
        </div>

        <!-- Environmental Impact NWPP Visual Tiles -->
        <div id="orgNwppImpactPanel" class="card ${activeTab === "nwpp" ? "" : "hidden"}" style="padding: 24px; margin-bottom: 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="color: var(--green); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">ECOLOGICAL CONTRIBUTION</span>
                <h3 style="font-size: 20px; margin-top: 4px; font-weight: 800; color: var(--ink);">OUR ENVIRONMENTAL FOOTPRINT (BAGS)</h3>
            </div>
            
            <div class="grid" style="grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #2f6fed; background: #eef4ff;">
                        <i class="fa-solid fa-bag-shopping"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(supAvoided)}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">SUP Bags Eliminated</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #2f8f6b; background: #e8f5ef;">
                        <i class="fa-solid fa-leaf"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(plasticPrevented.toFixed(1))} kg</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Plastic Prevented</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #b85c00; background: #fff4df;">
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(crudeOilSaved.toFixed(1))} kg</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Crude Oil Saved</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #007a87; background: #ecfafb;">
                        <i class="fa-solid fa-faucet-drip"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(waterSaved)} L</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Water Saved</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #6941c6; background: #f9f5ff;">
                        <i class="fa-solid fa-lightbulb"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(energySaved.toFixed(1))} kWh</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Energy Saved</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #c11574; background: #fdf2fa;">
                        <i class="fa-solid fa-cloud"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(co2Reduced.toFixed(1))} kg</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">CO<sub>2</sub> Reduced</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #b42318; background: #fff0ee;">
                        <i class="fa-solid fa-heart"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">Yes</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Supports Livelihoods</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #027a48; background: #ecfdf3;">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">Active</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Community Impact</div>
                </div>
            </div>

            <!-- Tree Equivalence Block NWPP -->
            <div class="tree-equivalence-block" style="border: 1px solid #cfe5da; border-radius: 10px; padding: 16px; background: #f0faf5; display: flex; align-items: center; gap: 20px;">
                <div style="font-size: 38px; color: var(--green); line-height: 1;">
                    <i class="fa-solid fa-tree"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: var(--green);">Tree Equivalence (Carbon Sequestration)</h4>
                    <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;">
                        <span style="font-size: 24px; font-weight: 800; color: var(--ink);">${numberText(treesPreserved.toFixed(3))} Trees</span>
                        <span style="color: var(--muted); font-size: 12px; font-weight: 500;">Equivalent Preserved</span>
                    </div>
                </div>
                <div style="max-width: 280px; font-size: 12px; color: #335c4c; border-left: 1px solid #cfe5da; padding-left: 16px;">
                    Our bags contributed help preserve the equivalent of <strong>0.075 trees</strong> through carbon sequestration.
                </div>
            </div>
        </div>

        <!-- Environmental Impact Garment Visual Tiles -->
        <div id="orgGarmentsImpactPanel" class="card ${activeTab === "garments" ? "" : "hidden"}" style="padding: 24px; margin-bottom: 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="color: var(--blue); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">GARMENT UPCYCLING</span>
                <h3 style="font-size: 20px; margin-top: 4px; font-weight: 800; color: var(--ink);">OUR ENVIRONMENTAL FOOTPRINT (GARMENTS)</h3>
            </div>
            
            <div class="grid" style="grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #2f6fed; background: #eef4ff;">
                        <i class="fa-solid fa-shirt"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(totalGarments)}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Garments Upcycled</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #2f8f6b; background: #e8f5ef;">
                        <i class="fa-solid fa-recycle"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(garmentWasteDiverted.toFixed(1))} kg</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Textile Waste Diverted</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #007a87; background: #ecfafb;">
                        <i class="fa-solid fa-water"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(garmentWaterPreserved)} L</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Water Preserved</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #b85c00; background: #fff4df;">
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(garmentEnergyPreserved.toFixed(1))} kWh</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Energy Preserved</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #c11574; background: #fdf2fa;">
                        <i class="fa-solid fa-cloud-sun"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(garmentCo2Extended.toFixed(1))} kg</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">CO<sub>2</sub>e Extended</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #027a48; background: #ecfdf3;">
                        <i class="fa-solid fa-bag-shopping"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(totalGarments)}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Utility Bags Created</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #6941c6; background: #f9f5ff;">
                        <i class="fa-solid fa-scissors"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">Yes</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Livelihood Opportunity</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #b42318; background: #fff0ee;">
                        <i class="fa-solid fa-circle-nodes"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">Active</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Community Impact</div>
                </div>
            </div>

            <!-- Tree Equivalence Block Garment -->
            <div class="tree-equivalence-block" style="border: 1px solid #bcd4ef; border-radius: 10px; padding: 16px; background: #f0f7ff; display: flex; align-items: center; gap: 20px;">
                <div style="font-size: 38px; color: var(--blue); line-height: 1;">
                    <i class="fa-solid fa-tree"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: var(--blue);">Tree Equivalence (Carbon Sequestration)</h4>
                    <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;">
                        <span style="font-size: 24px; font-weight: 800; color: var(--ink);">${numberText(garmentTreesPreserved.toFixed(3))} Trees</span>
                        <span style="color: var(--muted); font-size: 12px; font-weight: 500;">Equivalent Preserved</span>
                    </div>
                </div>
                <div style="max-width: 280px; font-size: 12px; color: #315a91; border-left: 1px solid #bcd4ef; padding-left: 16px;">
                    Our garment upcycling helps preserve the equivalent of <strong>1.2 trees</strong> through carbon sequestration.
                </div>
            </div>
        </div>

        <!-- Environmental Impact Diary Visual Tiles -->
        <div id="orgDiariesImpactPanel" class="card ${activeTab === "diaries" ? "" : "hidden"}" style="padding: 24px; margin-bottom: 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="color: #a0522d; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">DIARY CONTRIBUTIONS</span>
                <h3 style="font-size: 20px; margin-top: 4px; font-weight: 800; color: var(--ink);">OUR ENVIRONMENTAL FOOTPRINT (DIARIES)</h3>
            </div>
            
            <div class="grid" style="grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #a0522d; background: #faf0e6;">
                        <i class="fa-solid fa-book"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(totalDiaries)}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Diaries Contributed</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #2f6fed; background: #eef4ff;">
                        <i class="fa-solid fa-file-lines"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(diaryPages)}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Pages Recovered</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #2f8f6b; background: #e8f5ef;">
                        <i class="fa-solid fa-graduation-cap"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(diaryNotebooks)}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Notebooks Made</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #007a87; background: #ecfafb;">
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(diaryWaterSaved)} L</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Water Preserved</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #b85c00; background: #fff4df;">
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(diaryEnergySaved.toFixed(1))} kWh</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Energy Preserved</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #c11574; background: #fdf2fa;">
                        <i class="fa-solid fa-cloud"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">${numberText(diaryCo2Avoided.toFixed(1))} kg</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">CO<sub>2</sub> Impact Avoided</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #b42318; background: #fff0ee;">
                        <i class="fa-solid fa-handshake-angle"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">Yes</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Supports Livelihoods</div>
                </div>
                <div class="impact-tile" style="text-align: center; padding: 18px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--line);">
                    <div class="impact-icon-wrap" style="width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 18px; color: #027a48; background: #ecfdf3;">
                        <i class="fa-solid fa-pen-nib"></i>
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 2px;">Active</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--muted);">Creates Change</div>
                </div>
            </div>

            <!-- Tree Equivalence Block Diary -->
            <div class="tree-equivalence-block" style="border: 1px solid #e5d3c3; border-radius: 10px; padding: 16px; background: #faf5f0; display: flex; align-items: center; gap: 20px;">
                <div style="font-size: 38px; color: #a0522d; line-height: 1;">
                    <i class="fa-solid fa-tree"></i>
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #a0522d;">Tree Equivalence (Carbon Sequestration)</h4>
                    <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;">
                        <span style="font-size: 24px; font-weight: 800; color: var(--ink);">${numberText(diaryTreesPreserved.toFixed(3))} Trees</span>
                        <span style="color: var(--muted); font-size: 12px; font-weight: 500;">Equivalent Preserved</span>
                    </div>
                </div>
                <div style="max-width: 280px; font-size: 12px; color: #8b5a2b; border-left: 1px solid #e5d3c3; padding-left: 16px;">
                    Our diaries contributed help preserve the equivalent of <strong>0.015 trees</strong> through carbon sequestration.
                </div>
            </div>
        </div>

        <!-- Organisation Goal Progress Chart -->
        <div class="card" style="padding: 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; gap: 28px; flex-wrap: wrap;">
            <svg width="110" height="110" viewBox="0 0 120 120" style="transform: rotate(-90deg); flex-shrink: 0;">
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="#e8edf3" stroke-width="12"></circle>
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--green)" stroke-width="12"
                    stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
                    stroke-linecap="round" style="transition: stroke-dashoffset 0.8s ease;"></circle>
            </svg>
            <div>
                <h4 style="margin: 0; font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em;">Our Bag Goal Progress</h4>
                <div style="font-size: 32px; font-weight: 800; color: var(--green); margin-top: 2px;">${overallPct}%</div>
                <div style="font-size: 13px; color: var(--ink); font-weight: 600; margin-top: 2px;">Target Achieved</div>
                <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">
                    Contributed <strong>${numberText(totalNWPP)}</strong> of <strong>${numberText(targetNWPP)}</strong> target bags
                </div>
            </div>
        </div>

        <!-- Department Breakdown Table -->
        <div class="card" style="padding: 24px;">
            <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 16px;">Department-level impact breakdown</h3>
            ${filteredDepts.length ? `
                <div style="overflow-x: auto;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Department / Nodal</th>
                                <th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">NWPP Bags</th>
                                <th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Garments</th>
                                <th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Diaries</th>
                                <th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Pages Recovered</th>
                                <th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Total Trees Preserved</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredDepts.map((dept) => {
                                const deptBags = Number(dept.nwpp_bags || 0);
                                const deptGarments = Number(dept.garments || 0);
                                const deptDiaries = Number(diariesByDept.get(dept.id) || 0);
                                const combinedTrees = (deptBags * MULTIPLIERS.trees) + (deptGarments * GARMENT_MULTIPLIERS.trees) + (deptDiaries * DIARY_MULTIPLIERS.trees);
                                return `
                                    <tr>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">
                                            <strong>${escapeHtml(dept.department_name)}</strong><br>
                                            <span style="font-size: 11px; color: var(--muted);">${escapeHtml(dept.nodal_name || "Unassigned")}</span>
                                        </td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(deptBags)}</td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(deptGarments)}</td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(deptDiaries)}</td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(deptDiaries * DIARY_MULTIPLIERS.pages)}</td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(combinedTrees.toFixed(3))}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            ` : `<div style="color: var(--muted); padding: 16px 0; text-align: center;">No nodal departments found matching search term.</div>`}
        </div>
    `;

    // Delegated container click registration
    if (!container.dataset.listenerBound) {
        container.dataset.listenerBound = "true";
        container.addEventListener("click", (event) => {
            const tabCard = event.target.closest("[data-tab]");
            if (tabCard) {
                activeTab = tabCard.dataset.tab;
                const searchVal = document.getElementById("orgImpactSearch")?.value || "";
                renderOrgImpact(container, summary, searchVal, programSettings);
            }
        });
    }
}
