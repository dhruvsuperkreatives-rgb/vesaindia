import {
    ensureAdmin,
    loadAdminData,
    saveProgram,
    setProgramActive,
    signOut,
    updateOrganisation
} from "./api.js";
import { buildAdminModel, replaceOrganisation, replaceProgram } from "./data.js";
import { renderHome } from "./home.js";
import { renderApprovals } from "./approvals.js";
import { renderOrganisations } from "./organisations.js";
import { renderReports } from "./reports.js";
import { renderSettings } from "./settings.js";
import { populatePeopleFilters, renderPeople } from "./people.js";

const pageTitles = {
    home: "Home",
    approvals: "Approvals",
    organisations: "Organisations",
    people: "Mission People",
    reports: "Reports",
    settings: "Settings"
};

const elements = {
    body: document.body,
    pageTitle: document.getElementById("pageTitle"),
    pages: [...document.querySelectorAll("[data-page]")],
    routeLinks: [...document.querySelectorAll("[data-route]")],
    home: document.getElementById("homeContent"),
    approvals: document.getElementById("approvalsContent"),
    organisations: document.getElementById("organisationsContent"),
    people: document.getElementById("peopleContent"),
    reports: document.getElementById("reportsContent"),
    settings: document.getElementById("settingsContent"),
    notice: document.getElementById("globalNotice"),
    pendingCount: document.getElementById("pendingNavCount"),
    peopleCount: document.getElementById("peopleNavCount"),
    search: document.getElementById("organisationSearch"),
    dialog: document.getElementById("editOrganisationDialog"),
    editForm: document.getElementById("editOrganisationForm"),
    programDialog: document.getElementById("editProgramDialog"),
    programForm: document.getElementById("editProgramForm")
};

let model = buildAdminModel({
    organisations: [],
    contributions: [],
    garments: [],
    profiles: [],
    departments: [],
    programs: [],
    missionPeople: [],
    warnings: []
});
let reportFilters = { grouping: "day", start: "", organizationId: "" };
const peopleFilters = { search: "", organizationId: "", departmentId: "", volunteer: "" };

function showNotice(message = "", kind = "") {
    elements.notice.textContent = message;
    elements.notice.className = `notice${kind ? ` ${kind}` : ""}${message ? "" : " hidden"}`;
}

function closeMenu() {
    elements.body.classList.remove("menu-open");
}

function currentRoute() {
    const route = location.hash.replace("#", "").split("?")[0];
    return pageTitles[route] ? route : "home";
}

function routeOrganisationId() {
    const query = location.hash.split("?")[1] || "";
    return new URLSearchParams(query).get("organisation") || "";
}

function selectedOrganisation(id) {
    return model.organisations.find((org) => org.id === id) || null;
}

function applyRouteFilters(route = currentRoute()) {
    const organizationId = routeOrganisationId();
    if (route === "reports") reportFilters.organizationId = organizationId;
    if (route === "people") {
        peopleFilters.organizationId = organizationId;
        peopleFilters.departmentId = "";
    }
}

function showRoute(route = currentRoute()) {
    const selected = pageTitles[route] ? route : "home";
    elements.pageTitle.textContent = pageTitles[selected];
    elements.pages.forEach((page) => page.classList.toggle("active", page.dataset.page === selected));
    elements.routeLinks.forEach((link) => link.classList.toggle("active", link.dataset.route === selected));
    if (!location.hash) history.replaceState(null, "", `#${selected}`);
    closeMenu();
}

function renderAll() {
    renderHome(elements.home, model);
    renderApprovals(elements.approvals, model);
    renderOrganisations(elements.organisations, model, elements.search.value);
    populatePeopleFilters(model.missionPeople, peopleFilters, model.organisations);
    renderPeople(
        elements.people,
        model.missionPeople,
        peopleFilters,
        selectedOrganisation(peopleFilters.organizationId)
    );
    renderReports(elements.reports, model, reportFilters);
    renderSettings(elements.settings, model.programs);
    elements.pendingCount.textContent = model.organisations.filter((org) => org.status === "pending").length;
    elements.peopleCount.textContent = model.missionPeople.length;
}

async function refreshData() {
    showNotice("Loading admin data...");
    try {
        model = buildAdminModel(await loadAdminData());
        renderAll();
        showNotice(model.warnings.length
            ? `Some optional information could not load. ${model.warnings.join(" ")}`
            : "");
    } catch (error) {
        showNotice(error.message || "Admin data could not be loaded.", "error");
    }
}

async function changeStatus(id, status) {
    const verb = status === "approved" ? "approve" : "revoke or reject";
    if (!window.confirm(`Are you sure you want to ${verb} this organisation?`)) return;
    showNotice("Updating organisation access...");
    try {
        replaceOrganisation(model, await updateOrganisation(id, { status }));
        renderAll();
        showNotice(status === "approved" ? "Organisation approved." : "Organisation access revoked.");
    } catch (error) {
        showNotice(error.message || "Organisation could not be updated.", "error");
    }
}

function openEditDialog(id) {
    const org = model.organisations.find((item) => item.id === id);
    if (!org) return;
    elements.editForm.elements.id.value = org.id;
    elements.editForm.elements.organization_name.value = org.organization_name || "";
    elements.editForm.elements.status.value = org.status || "pending";
    elements.editForm.elements.company_logo_url.value = org.company_logo_url || "";
    elements.editForm.elements.organization_social_handle.value = org.organization_social_handle || "";
    elements.dialog.showModal();
}

function openProgramDialog(id = "") {
    const program = model.programs.find((item) => item.id === id);
    const form = elements.programForm;
    form.reset();
    form.elements.id.value = program?.id || "";
    form.elements.name.value = program?.name || "";
    form.elements.slug.value = program?.slug || "";
    form.elements.slug.disabled = Boolean(program);
    form.elements.description.value = program?.description || "";
    form.elements.minimum_quantity.value = program?.minimum_quantity ?? 1;
    form.elements.unit_label.value = program?.unit_label || "items";
    form.elements.target_per_participant.value = program?.target_per_participant ?? 0;
    form.elements.sort_order.value = program?.sort_order ?? (model.programs.length + 1) * 10;
    form.elements.is_active.checked = program?.is_active ?? true;
    form.elements.show_on_registration.checked = program?.show_on_registration ?? true;
    form.elements.utility_bag_available.checked = program?.utility_bag_available ?? false;
    form.elements.utility_bag_fee.value = program?.utility_bag_fee ?? 0;
    document.getElementById("programDialogTitle").textContent = program ? "Edit program" : "Add program";
    elements.programDialog.showModal();
}

document.addEventListener("click", (event) => {
    const closeDialogButton = event.target.closest("[data-close-dialog]");
    if (closeDialogButton) {
        document.getElementById(closeDialogButton.dataset.closeDialog)?.close();
        return;
    }

    const route = event.target.closest("[data-route]");
    if (route) {
        event.preventDefault();
        location.hash = route.dataset.route;
        showRoute(route.dataset.route);
        return;
    }

    const organisationViewButton = event.target.closest("[data-org-view]");
    if (organisationViewButton) {
        const routeName = organisationViewButton.dataset.orgView;
        const organizationId = organisationViewButton.dataset.orgId;
        if (routeName === "reports") reportFilters.organizationId = organizationId;
        if (routeName === "people") {
            peopleFilters.organizationId = organizationId;
            peopleFilters.departmentId = "";
        }
        location.hash = `${routeName}?organisation=${encodeURIComponent(organizationId)}`;
        applyRouteFilters(routeName);
        renderAll();
        showRoute(routeName);
        return;
    }

    const statusButton = event.target.closest("[data-org-status]");
    if (statusButton) {
        changeStatus(statusButton.dataset.orgId, statusButton.dataset.orgStatus);
        return;
    }

    const editButton = event.target.closest("[data-edit-organisation]");
    if (editButton) openEditDialog(editButton.dataset.editOrganisation);

    const editProgramButton = event.target.closest("[data-edit-program]");
    if (editProgramButton) openProgramDialog(editProgramButton.dataset.editProgram);

    const toggleProgramButton = event.target.closest("[data-toggle-program]");
    if (toggleProgramButton) {
        const enable = toggleProgramButton.dataset.programActive !== "true";
        showNotice(enable ? "Enabling program..." : "Disabling program...");
        setProgramActive(toggleProgramButton.dataset.toggleProgram, enable)
            .then((program) => {
                replaceProgram(model, program);
                renderAll();
                showNotice(enable ? "Program enabled." : "Program disabled.");
            })
            .catch((error) => showNotice(error.message || "Program could not be updated.", "error"));
    }
});

elements.search.addEventListener("input", () => {
    renderOrganisations(elements.organisations, model, elements.search.value);
});

document.getElementById("adminPeopleSearch").addEventListener("input", (event) => {
    peopleFilters.search = event.target.value.trim();
    renderPeople(elements.people, model.missionPeople, peopleFilters, selectedOrganisation(peopleFilters.organizationId));
});

document.getElementById("adminPeopleOrganisation").addEventListener("change", (event) => {
    peopleFilters.organizationId = event.target.value;
    peopleFilters.departmentId = "";
    populatePeopleFilters(model.missionPeople, peopleFilters, model.organisations);
    renderPeople(elements.people, model.missionPeople, peopleFilters, selectedOrganisation(peopleFilters.organizationId));
});

document.getElementById("adminPeopleDepartment").addEventListener("change", (event) => {
    peopleFilters.departmentId = event.target.value;
    renderPeople(elements.people, model.missionPeople, peopleFilters, selectedOrganisation(peopleFilters.organizationId));
});

document.getElementById("adminPeopleVolunteer").addEventListener("change", (event) => {
    peopleFilters.volunteer = event.target.value;
    renderPeople(elements.people, model.missionPeople, peopleFilters, selectedOrganisation(peopleFilters.organizationId));
});

elements.people.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy-person-code]");
    if (!copyButton) return;
    await navigator.clipboard.writeText(copyButton.dataset.copyPersonCode);
    const original = copyButton.innerHTML;
    copyButton.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
    setTimeout(() => { copyButton.innerHTML = original; }, 1400);
});

elements.reports.addEventListener("change", (event) => {
    if (event.target.id === "reportOrganisation") reportFilters.organizationId = event.target.value;
    if (event.target.id === "reportGrouping") reportFilters.grouping = event.target.value;
    if (event.target.id === "reportStartDate") reportFilters.start = event.target.value;
    renderReports(elements.reports, model, reportFilters);
});

elements.editForm.addEventListener("submit", async (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const formData = new FormData(elements.editForm);
    const id = formData.get("id");
    showNotice("Saving organisation changes...");
    try {
        replaceOrganisation(model, await updateOrganisation(id, {
            organization_name: String(formData.get("organization_name") || "").trim(),
            status: formData.get("status"),
            company_logo_url: String(formData.get("company_logo_url") || "").trim() || null,
            organization_social_handle: String(formData.get("organization_social_handle") || "").trim() || null
        }));
        elements.dialog.close();
        renderAll();
        showNotice("Organisation updated.");
    } catch (error) {
        showNotice(error.message || "Organisation could not be saved.", "error");
    }
});

elements.programForm.addEventListener("submit", async (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const form = elements.programForm;
    showNotice("Saving program settings...");
    try {
        const program = await saveProgram({
            id: form.elements.id.value || null,
            name: form.elements.name.value.trim(),
            slug: form.elements.slug.value.trim(),
            description: form.elements.description.value.trim() || null,
            minimum_quantity: Number(form.elements.minimum_quantity.value),
            unit_label: form.elements.unit_label.value.trim(),
            target_per_participant: Number(form.elements.target_per_participant.value),
            sort_order: Number(form.elements.sort_order.value),
            is_active: form.elements.is_active.checked,
            show_on_registration: form.elements.show_on_registration.checked,
            utility_bag_available: form.elements.utility_bag_available.checked,
            utility_bag_fee: Number(form.elements.utility_bag_fee.value)
        });
        replaceProgram(model, program);
        elements.programDialog.close();
        renderAll();
        showNotice("Program settings saved.");
    } catch (error) {
        showNotice(error.message || "Program settings could not be saved.", "error");
    }
});

document.getElementById("revokeAccessButton").addEventListener("click", () => {
    const id = elements.editForm.elements.id.value;
    elements.dialog.close();
    changeStatus(id, "rejected");
});
document.getElementById("addProgramButton").addEventListener("click", () => openProgramDialog());

document.getElementById("menuButton").addEventListener("click", () => elements.body.classList.add("menu-open"));
document.getElementById("sidebarClose").addEventListener("click", closeMenu);
document.getElementById("sidebarOverlay").addEventListener("click", closeMenu);
document.getElementById("refreshButton").addEventListener("click", refreshData);
document.getElementById("logoutButton").addEventListener("click", async () => {
    await signOut();
    window.location.replace("/login/");
});
window.addEventListener("hashchange", () => {
    const route = currentRoute();
    applyRouteFilters(route);
    renderAll();
    showRoute(route);
});

async function start() {
    applyRouteFilters();
    showRoute();
    const access = await ensureAdmin();
    if (access.redirect) {
        window.location.replace(access.redirect);
        return;
    }
    document.getElementById("adminEmail").textContent = access.user.email || "Admin account";
    await refreshData();
}

start();
