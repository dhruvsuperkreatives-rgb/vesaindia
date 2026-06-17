const MULTIPLIERS = {
  supBags: 100,
  plasticKg: 0.25,
  crudeOilKg: 0.44,
  waterLitres: 45,
  energyKwh: 3.75,
  co2Kg: 1.5,
  trees: 0.075,
};

const GARMENT_MULTIPLIERS = {
  divertedKg: 0.7,
  waterLitres: 7500,
  energyKwh: 25,
  co2Kg: 25,
  trees: 1.2,
};

const DIARY_MULTIPLIERS = {
  pages: 384,
  notebooks: 8,
  waterLitres: 40.5,
  energyKwh: 3,
  co2Kg: 1.35,
  trees: 0.015,
};

let activeTab = "total";

export function renderOrgImpact(
  container,
  summary,
  search = "",
  programSettings = [],
  selectedProgramIds = []
) {
  // Store selectedProgramIds on container so that interactive tab clicks have access to it
  if (selectedProgramIds && selectedProgramIds.length > 0) {
    container.selectedProgramIds = selectedProgramIds;
  }
  const currentSelectedProgramIds = selectedProgramIds && selectedProgramIds.length > 0
    ? selectedProgramIds
    : (container.selectedProgramIds || []);

  const isSelected = (slug) => {
    if (!currentSelectedProgramIds || currentSelectedProgramIds.length === 0) return true;
    const prog = programSettings.find((p) => p.slug === slug);
    return prog ? currentSelectedProgramIds.includes(prog.id) : true;
  };

  const showNwpp = isSelected("nwpp_bag");
  const showGarments = isSelected("garment");
  const showDiaries = isSelected("diary");

  const org = summary.organization || {};
  const orgTotals = summary.org_totals || {};
  const departments = summary.departments || [];
  const programContributions = summary.program_contributions || [];

  // Map of user_id -> role for our organization
  const people = summary.mission_people || [];
  const userRoles = new Map(people.map((p) => [p.id, p.role]));

  const getBreakdown = (contributions) => {
    const uniqueUsers = new Set(
      contributions.map((c) => c.user_id).filter(Boolean),
    );
    const breakdown = { employee: 0, nodal: 0, head: 0 };
    uniqueUsers.forEach((uid) => {
      const role = userRoles.get(uid) || "employee";
      if (role === "employee") breakdown.employee++;
      else if (role === "nodal_officer") breakdown.nodal++;
      else if (role === "org_head" || role === "admin") breakdown.head++;
    });
    return breakdown;
  };

  function formatParticipantBreakdown(breakdown) {
    const parts = [];
    if (breakdown.employee > 0) {
      parts.push(
        `${breakdown.employee} employee${breakdown.employee > 1 ? "s" : ""}`,
      );
    }
    if (breakdown.nodal > 0) {
      parts.push(
        `${breakdown.nodal} nodal officer${breakdown.nodal > 1 ? "s" : ""}`,
      );
    }
    if (breakdown.head > 0) {
      parts.push(`${breakdown.head} org head${breakdown.head > 1 ? "s" : ""}`);
    }
    if (parts.length === 0) return "0 employees participated";
    return parts.join(", ") + " participated";
  }

  const participantCount = (
    summary.mission_people ||
    summary.employees ||
    []
  ).filter((p) => (p.organization_id === org.id || p.organization_registration_id === org.id) && (p.role === "employee" || p.role === "nodal_officer")).length;
  const nwppProgram = programSettings.find((p) => p.slug === "nwpp_bag");
  const nwppTargetPer = nwppProgram
    ? Number(nwppProgram.target_per_participant || 0)
    : 10;
  const targetNWPP = participantCount * nwppTargetPer;
  const totalNWPP = Number(orgTotals.nwpp_bags || 0);
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
      .filter(
        (item) => item.program_id === diaryProgramId && item.department_id,
      )
      .forEach((item) => {
        diariesByDept.set(
          item.department_id,
          (diariesByDept.get(item.department_id) || 0) +
            Number(item.quantity || 0),
        );
      });
  }

  const nwppBreakdown = getBreakdown(summary.nwpp_contributions || []);
  const garmentsBreakdown = getBreakdown(summary.garment_contributions || []);
  const diariesBreakdown = getBreakdown(
    (summary.program_contributions || []).filter(
      (item) => item.program_id === diaryProgramId,
    ),
  );

  // Calculate total NWPP impact
  const supAvoided = showNwpp ? totalNWPP * MULTIPLIERS.supBags : 0;
  const plasticPrevented = showNwpp ? totalNWPP * MULTIPLIERS.plasticKg : 0;
  const crudeOilSaved = showNwpp ? totalNWPP * MULTIPLIERS.crudeOilKg : 0;
  const waterSaved = showNwpp ? totalNWPP * MULTIPLIERS.waterLitres : 0;
  const energySaved = showNwpp ? totalNWPP * MULTIPLIERS.energyKwh : 0;
  const co2Reduced = showNwpp ? totalNWPP * MULTIPLIERS.co2Kg : 0;
  const treesPreserved = showNwpp ? totalNWPP * MULTIPLIERS.trees : 0;

  // Calculate total Garment impact
  const garmentWasteDiverted = showGarments ? totalGarments * GARMENT_MULTIPLIERS.divertedKg : 0;
  const garmentWaterPreserved = showGarments ? totalGarments * GARMENT_MULTIPLIERS.waterLitres : 0;
  const garmentEnergyPreserved = showGarments ? totalGarments * GARMENT_MULTIPLIERS.energyKwh : 0;
  const garmentCo2Extended = showGarments ? totalGarments * GARMENT_MULTIPLIERS.co2Kg : 0;
  const garmentTreesPreserved = showGarments ? totalGarments * GARMENT_MULTIPLIERS.trees : 0;

  // Calculate total Diary impact
  const diaryPages = showDiaries ? totalDiaries * DIARY_MULTIPLIERS.pages : 0;
  const diaryNotebooks = showDiaries ? totalDiaries * DIARY_MULTIPLIERS.notebooks : 0;
  const diaryWaterSaved = showDiaries ? totalDiaries * DIARY_MULTIPLIERS.waterLitres : 0;
  const diaryEnergySaved = showDiaries ? totalDiaries * DIARY_MULTIPLIERS.energyKwh : 0;
  const diaryCo2Avoided = showDiaries ? totalDiaries * DIARY_MULTIPLIERS.co2Kg : 0;
  const diaryTreesPreserved = showDiaries ? totalDiaries * DIARY_MULTIPLIERS.trees : 0;

  // Filter departments for table view
  const term = search.trim().toLowerCase();
  const filteredDepts = departments.filter(
    (dept) =>
      !term ||
      String(dept.department_name || "")
        .toLowerCase()
        .includes(term) ||
      String(dept.nodal_name || "")
        .toLowerCase()
        .includes(term),
  );

  // Donut chart calculation
  const overallPct =
    targetNWPP > 0 ? Math.round((totalNWPP / targetNWPP) * 100) : 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, overallPct) / 100) * circumference;

  const garmentProgram = programSettings.find((p) => p.slug === "garment");
  const garmentTargetPer =
    garmentProgram && Number(garmentProgram.target_per_participant) > 0
      ? Number(garmentProgram.target_per_participant)
      : 1;
  const targetGarments = participantCount * garmentTargetPer;
  const garmentPct =
    targetGarments > 0 ? Math.round((totalGarments / targetGarments) * 100) : 0;
  const garmentStrokeDashoffset =
    circumference - (Math.min(100, garmentPct) / 100) * circumference;

  const diaryTargetPer =
    diaryProgram && Number(diaryProgram.target_per_participant) > 0
      ? Number(diaryProgram.target_per_participant)
      : 1;
  const targetDiaries = participantCount * diaryTargetPer;
  const diaryPct =
    targetDiaries > 0 ? Math.round((totalDiaries / targetDiaries) * 100) : 0;
  const diaryStrokeDashoffset =
    circumference - (Math.min(100, diaryPct) / 100) * circumference;

  // Active tab styles
  const totalStyle =
    activeTab === "total"
      ? "border: 2px solid var(--green); box-shadow: 0 4px 15px rgba(36, 124, 92, 0.15); transform: translateY(-2px);"
      : "cursor: pointer;";
  const nwppStyle =
    activeTab === "nwpp"
      ? "border: 2px solid var(--green); box-shadow: 0 4px 15px rgba(47, 143, 107, 0.15); transform: translateY(-2px);"
      : "cursor: pointer;";
  const garmentStyle =
    activeTab === "garments"
      ? "border: 2px solid var(--blue); box-shadow: 0 4px 15px rgba(47, 111, 237, 0.15); transform: translateY(-2px);"
      : "cursor: pointer;";
  const diaryStyle =
    activeTab === "diaries"
      ? "border: 2px solid #a0522d; box-shadow: 0 4px 15px rgba(160, 82, 45, 0.15); transform: translateY(-2px);"
      : "cursor: pointer;";

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

  const visibleTabs = [true, showNwpp, showGarments, showDiaries].filter(Boolean).length;

  container.innerHTML = `
        <!-- Top Summary Cards (Interactive Tabs) -->
        <div class="stats" style="grid-template-columns: repeat(${visibleTabs}, minmax(0, 1fr)); margin-bottom: 24px;">
            <article class="card" data-tab="total" style="${totalStyle} transition: all 0.2s ease;">
                <div class="metric-label">Total Impact</div>
                <div class="metric-value" style="color: var(--green);">Combined</div>
                <div class="metric-unit">view all &rarr;</div>
            </article>
            ${showNwpp ? `
            <article class="card" data-tab="nwpp" style="${nwppStyle} transition: all 0.2s ease;">
                <div class="metric-label">Organisation NWPP</div>
                <div class="metric-value" style="color: var(--green);">${numberText(totalNWPP)}</div>
                <div class="metric-unit">bags &rarr;</div>
            </article>` : ""}
            ${showGarments ? `
            <article class="card" data-tab="garments" style="${garmentStyle} transition: all 0.2s ease;">
                <div class="metric-label">Organisation Garments</div>
                <div class="metric-value" style="color: var(--blue);">${numberText(totalGarments)}</div>
                <div class="metric-unit">items &rarr;</div>
            </article>` : ""}
            ${showDiaries ? `
            <article class="card" data-tab="diaries" style="${diaryStyle} transition: all 0.2s ease;">
                <div class="metric-label">Organisation Diaries</div>
                <div class="metric-value" style="color: #a0522d;">${numberText(totalDiaries)}</div>
                <div class="metric-unit">diaries &rarr;</div>
            </article>` : ""}
        </div>

        <!-- Total Combined Environmental Impact Panel -->
        <div id="orgTotalImpactPanel" class="card ${activeTab === "total" ? "" : "hidden"}" style="padding: 28px; margin-bottom: 24px; background: linear-gradient(135deg, #f0faf5 0%, #e7f4ee 100%); border: 1px solid #cfe5da;">
            <div style="text-align: center; margin-bottom: 32px;">
                <span style="color: var(--green); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">COMPREHENSIVE ENVIRONMENTAL IMPACT</span>
                <h3 style="font-size: 24px; margin: 8px 0 0; font-weight: 900; color: var(--ink); background: linear-gradient(135deg, #247c5c 0%, #2f8f6b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">OUR COMBINED MISSION FOOTPRINT</h3>
                <p style="color: var(--muted); margin: 8px 0 0; font-size: 13px;">Total impact across NWPP Bags, Garments Upcycling, and Diary Contributions</p>
            </div>
            
            <!-- Key Impact Metrics Grid (3x3) -->
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 28px;">
                <!-- Row 1: Primary Metrics -->
                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #cfe5da; box-shadow: 0 2px 8px rgba(36, 124, 92, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #247c5c 0%, #1b5a47 100%); box-shadow: 0 4px 12px rgba(36, 124, 92, 0.3);">
                        <i class="fa-solid fa-water"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText((waterSaved + garmentWaterPreserved + diaryWaterSaved).toFixed(0))} L</div>
                    <div style="font-size: 12px; font-weight: 700; color: var(--green); margin-bottom: 8px;">WATER PRESERVED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Fresh water saved</span>
                        <span style="font-size: 10px;">${numberText(((waterSaved + garmentWaterPreserved + diaryWaterSaved) / 1000).toFixed(0))} thousand liters</span>
                    </div>
                </div>

                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #dbeafe; box-shadow: 0 2px 8px rgba(47, 111, 237, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #2f6fed 0%, #1d4ed8 100%); box-shadow: 0 4px 12px rgba(47, 111, 237, 0.3);">
                        <i class="fa-solid fa-lightbulb"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText((energySaved + garmentEnergyPreserved + diaryEnergySaved).toFixed(1))} kWh</div>
                    <div style="font-size: 12px; font-weight: 700; color: #2f6fed; margin-bottom: 8px;">ENERGY CONSERVED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Clean energy equivalent</span>
                        <span style="font-size: 10px;">Enough to power homes</span>
                    </div>
                </div>

                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #fee2e2; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                        <i class="fa-solid fa-cloud"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText((co2Reduced + garmentCo2Extended + diaryCo2Avoided).toFixed(1))} kg</div>
                    <div style="font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 8px;">CO₂ EMISSIONS AVOIDED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Carbon footprint reduced</span>
                        <span style="font-size: 10px;">${numberText(((co2Reduced + garmentCo2Extended + diaryCo2Avoided) / 1000).toFixed(2))} metric tons</span>
                    </div>
                </div>

                <!-- Row 2: Secondary Metrics -->
                ${showNwpp ? `
                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #dcfce7; box-shadow: 0 2px 8px rgba(47, 143, 107, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #2f8f6b 0%, #065f46 100%); box-shadow: 0 4px 12px rgba(47, 143, 107, 0.3);">
                        <i class="fa-solid fa-leaf"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText(plasticPrevented.toFixed(1))} kg</div>
                    <div style="font-size: 12px; font-weight: 700; color: #2f8f6b; margin-bottom: 8px;">PLASTIC PREVENTED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Single-use plastic diverted</span>
                        <span style="font-size: 10px;">From landfills and oceans</span>
                    </div>
                </div>

                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #fef3c7; box-shadow: 0 2px 8px rgba(184, 92, 0, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #b85c00 0%, #92400e 100%); box-shadow: 0 4px 12px rgba(184, 92, 0, 0.3);">
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText(crudeOilSaved.toFixed(1))} kg</div>
                    <div style="font-size: 12px; font-weight: 700; color: #b85c00; margin-bottom: 8px;">CRUDE OIL SAVED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Petroleum resources conserved</span>
                        <span style="font-size: 10px;">Non-renewable energy preserved</span>
                    </div>
                </div>` : ""}

                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #ecfdf3; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                        <i class="fa-solid fa-tree"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText((treesPreserved + garmentTreesPreserved + diaryTreesPreserved).toFixed(2))}</div>
                    <div style="font-size: 12px; font-weight: 700; color: #10b981; margin-bottom: 8px;">TREES PRESERVED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Forest equivalent saved</span>
                        <span style="font-size: 10px;">Through carbon sequestration</span>
                    </div>
                </div>

                <!-- Row 3: Contribution Metrics -->
                ${showNwpp ? `
                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #f5d4f5; box-shadow: 0 2px 8px rgba(168, 85, 247, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%); box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);">
                        <i class="fa-solid fa-bag-shopping"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText(supAvoided)}</div>
                    <div style="font-size: 12px; font-weight: 700; color: #a855f7; margin-bottom: 8px;">SUP BAGS ELIMINATED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Single-use carrier bags</span>
                        <span style="font-size: 10px;">Prevented from circulation</span>
                    </div>
                </div>` : ""}

                ${showDiaries ? `
                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #cfe5da; box-shadow: 0 2px 8px rgba(36, 124, 92, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #247c5c 0%, #1b5a47 100%); box-shadow: 0 4px 12px rgba(36, 124, 92, 0.3);">
                        <i class="fa-solid fa-file-lines"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText(diaryPages)}</div>
                    <div style="font-size: 12px; font-weight: 700; color: var(--green); margin-bottom: 8px;">PAGES RECOVERED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Diary pages reused</span>
                        <span style="font-size: 10px;">${numberText(diaryNotebooks)} notebooks created</span>
                    </div>
                </div>` : ""}

                ${showGarments ? `
                <div class="impact-tile" style="text-align: center; padding: 24px; border-radius: 12px; background: #ffffff; border: 2px solid #fdf2f8; box-shadow: 0 2px 8px rgba(190, 24, 93, 0.08); transition: all 0.3s ease;">
                    <div class="impact-icon-wrap" style="width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; font-size: 24px; color: #ffffff; background: linear-gradient(135deg, #be185d 0%, #831843 100%); box-shadow: 0 4px 12px rgba(190, 24, 93, 0.3);">
                        <i class="fa-solid fa-recycle"></i>
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--ink); margin-bottom: 4px;">${numberText(garmentWasteDiverted.toFixed(1))} kg</div>
                    <div style="font-size: 12px; font-weight: 700; color: #be185d; margin-bottom: 8px;">TEXTILE WASTE DIVERTED</div>
                    <div style="font-size: 11px; color: var(--muted); line-height: 1.5;">
                        <span style="display: block; font-weight: 600;">Garment upcycling impact</span>
                        <span style="font-size: 10px;">Waste redirected to value</span>
                    </div>
                </div>` : ""}
            </div>

            <!-- Overall Impact Summary Card -->
            <div style="border-radius: 12px; padding: 28px; background: linear-gradient(135deg, #247c5c 0%, #2f8f6b 100%); color: white; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(36, 124, 92, 0.2);">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; align-items: center;">
                    <div>
                        <h4 style="margin: 0 0 8px; font-size: 13px; font-weight: 700; opacity: 0.9; letter-spacing: 0.05em; text-transform: uppercase;">Overall Impact</h4>
                        <div style="font-size: 28px; font-weight: 900;">Multiple Programs</div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 6px; font-weight: 500;">
                            <span>${numberText((showNwpp ? totalNWPP : 0) + (showGarments ? totalGarments : 0) + (showDiaries ? totalDiaries : 0))} total items contributed</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 42px; font-weight: 900; margin-bottom: 4px;">
                            ${numberText((treesPreserved + garmentTreesPreserved + diaryTreesPreserved).toFixed(1))}
                        </div>
                        <div style="font-size: 13px; font-weight: 600; opacity: 0.95;">Trees Equivalent Protected</div>
                        <div style="font-size: 11px; opacity: 0.8; margin-top: 6px;">
                            ${numberText(((co2Reduced + garmentCo2Extended + diaryCo2Avoided) / 1000).toFixed(2))} metric tons CO₂ avoided
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Facts Section -->
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                <div style="background: #ede9fe; border-radius: 10px; padding: 16px; border: 1px solid #ddd6fe;">
                    <div style="font-size: 11px; font-weight: 800; color: var(--green); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Contributions</div>
                    <div style="font-size: 18px; font-weight: 900; color: var(--ink);">${numberText((showNwpp ? totalNWPP : 0) + (showGarments ? totalGarments : 0) + (showDiaries ? totalDiaries : 0))}</div>
                    <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 500;">Total items shared</div>
                </div>
                <div style="background: #e0e7ff; border-radius: 10px; padding: 16px; border: 1px solid #c7d2fe;">
                    <div style="font-size: 11px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Programs</div>
                    <div style="font-size: 18px; font-weight: 900; color: var(--ink);">${numberText(visibleTabs - 1)}</div>
                    <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 500;">Active initiatives</div>
                </div>
                <div style="background: #dbeafe; border-radius: 10px; padding: 16px; border: 1px solid #bfdbfe;">
                    <div style="font-size: 11px; font-weight: 800; color: #2f6fed; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Participation</div>
                    <div style="font-size: 18px; font-weight: 900; color: var(--ink);">${numberText(participantCount)}</div>
                    <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 500;">Active members</div>
                </div>
            </div>
        </div>
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
        <div style="margin-top: 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
             <div class="card" style="background: white; border: 1px solid var(--line); border-radius: 12px; padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 12px; font-weight: 750; color: var(--green); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">NWPP Bags Progress</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--ink);">${numberText(totalNWPP)} / ${numberText(targetNWPP)}</div>
                <div style="font-size: 11px; color: var(--muted); margin-top: 6px; font-weight: 600;">${formatParticipantBreakdown(nwppBreakdown)}</div>
            </div>
            <div class="card" style="background: white; border: 1px solid var(--line); border-radius: 12px; padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 12px; font-weight: 750; color: var(--blue); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Garments Progress</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--ink);">${numberText(totalGarments)} / ${numberText(targetGarments)}</div>
                <div style="font-size: 11px; color: var(--muted); margin-top: 6px; font-weight: 600;">${formatParticipantBreakdown(garmentsBreakdown)}</div>
            </div>
            <div class="card" style="background: white; border: 1px solid var(--line); border-radius: 12px; padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 12px; font-weight: 750; color: #a0522d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Diaries Progress</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--ink);">${numberText(totalDiaries)} / ${numberText(targetDiaries)}</div>
                <div style="font-size: 11px; color: var(--muted); margin-top: 6px; font-weight: 600;">${formatParticipantBreakdown(diariesBreakdown)}</div>
            </div>
        </div>

        <!-- Organisation Visual Analytics Grid (2x2) -->
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 24px; margin-bottom: 24px;">
            <!-- Pie Chart: Contribution Categories (NWPP vs Garments vs Diaries) -->
            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--ink); font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-chart-pie" style="color: var(--blue);"></i> Contribution Categories Distribution
                </h3>
                <div style="position: relative; height: 200px; width: 100%;">
                    <canvas id="orgCategoryPieChart"></canvas>
                </div>
            </article>

            <!-- Radar Chart: Ecological Footprint Comparison -->
            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--ink); font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-chart-simple" style="color: var(--green);"></i> Ecological Footprint Metrics
                </h3>
                <div style="position: relative; height: 200px; width: 100%;">
                    <canvas id="orgFootprintRadarChart"></canvas>
                </div>
            </article>

            <!-- Bar Chart: Contribution comparison across the top 5 departments -->
            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--ink); font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-building" style="color: #a0522d;"></i> Top 5 Departments Comparison
                </h3>
                <div style="position: relative; height: 200px; width: 100%;">
                    <canvas id="orgDeptBarChart"></canvas>
                </div>
            </article>

            <!-- Line Chart: Chronological Trend Line -->
            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--ink); font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-chart-line" style="color: var(--green);"></i> Chronological Trend Line
                </h3>
                <div style="position: relative; height: 200px; width: 100%;">
                    <canvas id="orgTrendLineChart"></canvas>
                </div>
            </article>
        </div>

         // Leaderboards / Top Performers Section
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 24px; margin-bottom: 24px;">
            <!-- Top Departments -->
            <article class="card" style="padding: 24px; background: white; border: 1px solid var(--line); border-radius: 12px;">
                <h3 style="margin-top: 0; margin-bottom: 18px; color: var(--ink); font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-trophy" style="color: #ffd700; font-size: 18px;"></i> Top Performing Departments
                </h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${(() => {
                      const topDepts = [...departments]
                        .map((dept) => {
                          const bags = showNwpp ? Number(dept.nwpp_bags || 0) : 0;
                          const garments = showGarments ? Number(dept.garments || 0) : 0;
                          const diaries = showDiaries ? Number(diariesByDept.get(dept.id) || 0) : 0;
                          const total = bags + garments + diaries;
                          return { ...dept, bags, garments, diaries, total };
                        })
                        .filter((dept) => dept.total > 0)
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 5);

                      return topDepts.length
                        ? topDepts
                            .map(
                              (dept, index) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line); transition: all 0.2s ease;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-weight: 800; font-size: 13px; width: 26px; height: 26px; border-radius: 50%; background: ${index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : index === 2 ? "#cd7f32" : "#e2e8f0"}; color: ${index <= 2 ? "#fff" : "var(--muted)"}; display: grid; place-items: center; box-shadow: ${index <= 2 ? "0 2px 4px rgba(0,0,0,0.1)" : "none"};">${index + 1}</span>
                                    <div>
                                        <strong style="font-size: 13px; color: var(--ink); display: block; font-weight: 700;">${escapeHtml(dept.department_name)}</strong>
                                        <span style="font-size: 11px; color: var(--muted);">Nodal: ${escapeHtml(dept.nodal_name || "Unassigned")}</span>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <span style="background: #e8f5ef; color: #2f8f6b; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 999px; display: inline-block;">${numberText(dept.total)} items</span>
                                    <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 500;">
                                        ${dept.bags ? `Bags: ${numberText(dept.bags)} · ` : ""}
                                        ${dept.garments ? `Garments: ${numberText(dept.garments)} · ` : ""}
                                        ${dept.diaries ? `Diaries: ${numberText(dept.diaries)}` : ""}
                                    </div>
                                </div>
                            </div>
                        `,
                            )
                            .join("")
                        : '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 20px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line);">No contributions logged yet.</div>';
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
                      const nwppContributions =
                        summary.nwpp_contributions || [];
                      const garmentContributions =
                        summary.garment_contributions || [];
                      const otherContributions = programContributions || [];
                      const people = summary.mission_people || [];

                      const topEmployees = people
                        .map((p) => {
                          const bags = showNwpp ? nwppContributions
                            .filter((c) => c.user_id === p.id)
                            .reduce(
                              (sum, c) => sum + Number(c.bags_count || 0),
                              0,
                            ) : 0;
                          const garments = showGarments ? garmentContributions
                            .filter((c) => c.user_id === p.id)
                            .reduce(
                              (sum, c) => sum + Number(c.garment_count || 0),
                              0,
                            ) : 0;
                          const others = showDiaries ? otherContributions
                            .filter((c) => c.user_id === p.id)
                            .reduce(
                              (sum, c) => sum + Number(c.quantity || 0),
                              0,
                            ) : 0;
                          const total = bags + garments + others;
                          return {
                            ...p,
                            bags,
                            garments,
                            others,
                            total,
                          };
                        })
                        .filter((p) => p.total > 0)
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 5);

                      return topEmployees.length
                        ? topEmployees
                            .map((p, index) => {
                              const fullName = [
                                p.first_name,
                                p.middle_name,
                                p.last_name,
                              ]
                                .filter(Boolean)
                                .join(" ");
                              return `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line); transition: all 0.2s ease;">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <span style="font-weight: 800; font-size: 13px; width: 26px; height: 26px; border-radius: 50%; background: ${index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : index === 2 ? "#cd7f32" : "#e2e8f0"}; color: ${index <= 2 ? "#fff" : "var(--muted)"}; display: grid; place-items: center; box-shadow: ${index <= 2 ? "0 2px 4px rgba(0,0,0,0.1)" : "none"};">${index + 1}</span>
                                        <div>
                                            <strong style="font-size: 13px; color: var(--ink); display: block; font-weight: 700;">${escapeHtml(fullName || "Mission Member")}</strong>
                                            <span style="font-size: 11px; color: var(--muted);">Dept: ${escapeHtml(p.department_name || "Organisation leadership")}</span>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="background: #eef4ff; color: #2f6fed; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 999px; display: inline-block;">${numberText(p.total)} items</span>
                                        <div style="font-size: 10px; color: var(--muted); margin-top: 4px; font-weight: 500;">
                                            ${p.bags ? `Bags: ${numberText(p.bags)} · ` : ""}
                                            ${p.garments ? `Garments: ${numberText(p.garments)} · ` : ""}
                                            ${p.others ? `Other: ${numberText(p.others)}` : ""}
                                        </div>
                                    </div>
                                </div>
                            `;
                            })
                            .join("")
                        : '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 20px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line);">No contributions logged yet.</div>';
                    })()}
                </div>
            </article>
        </div>

        <!-- Department Breakdown Table -->
        <div class="card" style="padding: 24px;">
            <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 16px;">Department-level impact breakdown</h3>
            ${
              filteredDepts.length
                ? `
                <div style="overflow-x: auto;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Department / Nodal</th>
                                ${showNwpp ? `<th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">NWPP Bags</th>` : ""}
                                ${showGarments ? `<th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Garments</th>` : ""}
                                ${showDiaries ? `<th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Diaries</th>` : ""}
                                ${showDiaries ? `<th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Pages Recovered</th>` : ""}
                                <th style="text-align: left; padding: 10px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted);">Total Trees Preserved</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredDepts
                              .map((dept) => {
                                const deptBags = Number(dept.nwpp_bags || 0);
                                const deptGarments = Number(dept.garments || 0);
                                const deptDiaries = Number(
                                  diariesByDept.get(dept.id) || 0,
                                );
                                const combinedTrees =
                                  (showNwpp ? deptBags * MULTIPLIERS.trees : 0) +
                                  (showGarments ? deptGarments * GARMENT_MULTIPLIERS.trees : 0) +
                                  (showDiaries ? deptDiaries * DIARY_MULTIPLIERS.trees : 0);
                                return `
                                    <tr>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">
                                            <strong>${escapeHtml(dept.department_name)}</strong><br>
                                            <span style="font-size: 11px; color: var(--muted);">${escapeHtml(dept.nodal_name || "Unassigned")}</span>
                                        </td>
                                        ${showNwpp ? `<td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(deptBags)}</td>` : ""}
                                        ${showGarments ? `<td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(deptGarments)}</td>` : ""}
                                        ${showDiaries ? `<td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(deptDiaries)}</td>` : ""}
                                        ${showDiaries ? `<td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(deptDiaries * DIARY_MULTIPLIERS.pages)}</td>` : ""}
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${numberText(combinedTrees.toFixed(3))}</td>
                                    </tr>
                                `;
                              })
                              .join("")}
                        </tbody>
                    </table>
                </div>
            `
                : `<div style="color: var(--muted); padding: 16px 0; text-align: center;">No nodal departments found matching search term.</div>`
            }
        </div>
    `;

  setTimeout(() => {
    // 1. Pie Chart
    const pieCtx = document
      .getElementById("orgCategoryPieChart")
      ?.getContext("2d");
    if (pieCtx) {
      const pieLabels = [];
      const pieData = [];
      const pieColors = [];
      if (showNwpp) {
        pieLabels.push("NWPP Bags");
        pieData.push(totalNWPP);
        pieColors.push("#2f8f6b");
      }
      if (showGarments) {
        pieLabels.push("Garments");
        pieData.push(totalGarments);
        pieColors.push("#2f6fed");
      }
      if (showDiaries) {
        pieLabels.push("Diaries");
        pieData.push(totalDiaries);
        pieColors.push("#a0522d");
      }
      new Chart(pieCtx, {
        type: "pie",
        data: {
          labels: pieLabels,
          datasets: [
            {
              data: pieData,
              backgroundColor: pieColors,
              borderWidth: 1.5,
              borderColor: "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
                font: { size: 10, weight: "bold" },
              },
            },
          },
        },
      });
    }

    // 2. Radar Chart
    const radarCtx = document
      .getElementById("orgFootprintRadarChart")
      ?.getContext("2d");
    if (radarCtx) {
      new Chart(radarCtx, {
        type: "radar",
        data: {
          labels: [
            "SUP Bags (x100)",
            "Plastic (kg)",
            "Water (L / 10)",
            "Energy (kWh)",
            "CO2 (kg)",
          ],
          datasets: [
            showNwpp && {
              label: "NWPP Bags",
              data: [
                totalNWPP,
                plasticPrevented,
                waterSaved / 10,
                energySaved,
                co2Reduced,
              ],
              backgroundColor: "rgba(47, 143, 107, 0.15)",
              borderColor: "#2f8f6b",
              pointBackgroundColor: "#2f8f6b",
              borderWidth: 2,
            },
            showGarments && {
              label: "Garments",
              data: [
                0,
                garmentWasteDiverted,
                garmentWaterPreserved / 10,
                garmentEnergyPreserved,
                garmentCo2Extended,
              ],
              backgroundColor: "rgba(47, 111, 237, 0.15)",
              borderColor: "#2f6fed",
              pointBackgroundColor: "#2f6fed",
              borderWidth: 2,
            },
            showDiaries && {
              label: "Diaries",
              data: [
                0,
                0,
                diaryWaterSaved / 10,
                diaryEnergySaved,
                diaryCo2Avoided,
              ],
              backgroundColor: "rgba(160, 82, 45, 0.15)",
              borderColor: "#a0522d",
              pointBackgroundColor: "#a0522d",
              borderWidth: 2,
            },
          ].filter(Boolean),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
                font: { size: 10, weight: "bold" },
              },
            },
          },
          scales: {
            r: {
              angleLines: { display: true },
              suggestedMin: 0,
              ticks: { font: { size: 8 } },
            },
          },
        },
      });
    }

    // 3. Bar Chart
    const barCtx = document.getElementById("orgDeptBarChart")?.getContext("2d");
    if (barCtx) {
      const topDeptsData = [...departments]
        .map((dept) => {
          const bags = showNwpp ? Number(dept.nwpp_bags || 0) : 0;
          const garments = showGarments ? Number(dept.garments || 0) : 0;
          const diaries = showDiaries ? Number(diariesByDept.get(dept.id) || 0) : 0;
          return {
            name: dept.department_name || "Unassigned",
            bags,
            garments,
            diaries,
          };
        })
        .sort(
          (a, b) =>
            b.bags + b.garments + b.diaries - (a.bags + a.garments + a.diaries),
        )
        .slice(0, 5);

      new Chart(barCtx, {
        type: "bar",
        data: {
          labels: topDeptsData.map((d) => d.name),
          datasets: [
            showNwpp && {
              label: "NWPP Bags",
              data: topDeptsData.map((d) => d.bags),
              backgroundColor: "#2f8f6b",
            },
            showGarments && {
              label: "Garments",
              data: topDeptsData.map((d) => d.garments),
              backgroundColor: "#2f6fed",
            },
            showDiaries && {
              label: "Diaries",
              data: topDeptsData.map((d) => d.diaries),
              backgroundColor: "#a0522d",
            },
          ].filter(Boolean),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { font: { size: 9 } },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: { font: { size: 9 } },
            },
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
                font: { size: 10, weight: "bold" },
              },
            },
          },
        },
      });
    }

    // 4. Line Chart
    const lineCtx = document
      .getElementById("orgTrendLineChart")
      ?.getContext("2d");
    if (lineCtx) {
      const datesMap = new Map();
      const addTrend = (dateStr, qty, type) => {
        if (!dateStr) return;
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return;
        const key = new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "numeric",
        }).format(date);
        const timestamp = new Date(
          date.getFullYear(),
          date.getMonth(),
          1,
        ).getTime();
        if (!datesMap.has(key)) {
          datesMap.set(key, {
            key,
            timestamp,
            nwpp: 0,
            garments: 0,
            diaries: 0,
          });
        }
        datesMap.get(key)[type] += qty;
      };

      (summary.nwpp_contributions || []).forEach((c) =>
        addTrend(c.created_at, Number(c.bags_count || 0), "nwpp"),
      );
      (summary.garment_contributions || []).forEach((c) =>
        addTrend(c.created_at, Number(c.garment_count || 0), "garments"),
      );
      (summary.program_contributions || [])
        .filter((item) => item.program_id === diaryProgramId)
        .forEach((c) =>
          addTrend(c.created_at, Number(c.quantity || 0), "diaries"),
        );

      const trendData = [...datesMap.values()].sort(
        (a, b) => a.timestamp - b.timestamp,
      );

      new Chart(lineCtx, {
        type: "line",
        data: {
          labels: trendData.map((t) => t.key),
          datasets: [
            showNwpp && {
              label: "NWPP Bags",
              data: trendData.map((t) => t.nwpp),
              borderColor: "#2f8f6b",
              backgroundColor: "rgba(47, 143, 107, 0.05)",
              borderWidth: 2.5,
              tension: 0.3,
              fill: true,
            },
            showGarments && {
              label: "Garments",
              data: trendData.map((t) => t.garments),
              borderColor: "#2f6fed",
              backgroundColor: "rgba(47, 111, 237, 0.05)",
              borderWidth: 2.5,
              tension: 0.3,
              fill: true,
            },
            showDiaries && {
              label: "Diaries",
              data: trendData.map((t) => t.diaries),
              borderColor: "#a0522d",
              backgroundColor: "rgba(160, 82, 45, 0.05)",
              borderWidth: 2.5,
              tension: 0.3,
              fill: true,
            },
          ].filter(Boolean),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
                font: { size: 10, weight: "bold" },
              },
            },
          },
          scales: {
            y: { beginAtZero: true, ticks: { font: { size: 9 } } },
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          },
        },
      });
    }
  }, 0);

  // Delegated container click registration
  if (!container.dataset.listenerBound) {
    container.dataset.listenerBound = "true";
    container.addEventListener("click", (event) => {
      const tabCard = event.target.closest("[data-tab]");
      if (tabCard) {
        activeTab = tabCard.dataset.tab;
        const searchVal =
          document.getElementById("orgImpactSearch")?.value || "";
        renderOrgImpact(container, summary, searchVal, programSettings, currentSelectedProgramIds);
      }
    });
  }
}
