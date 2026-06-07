import { escapeHtml, numberText } from "./utils.js";

function programCard(program) {
    return `
        <article class="programme-card">
            <div class="org-heading">
                <div>
                    <div class="org-name">${escapeHtml(program.name)}</div>
                    <div class="org-meta">${escapeHtml(program.description || "No description")}</div>
                </div>
                <span class="badge ${program.is_active ? "active" : "inactive"}">${program.is_active ? "Active" : "Disabled"}</span>
            </div>
            <div class="org-metrics">
                <div class="mini-stat"><span>Minimum</span><strong>${numberText(program.minimum_quantity)} ${escapeHtml(program.unit_label)}</strong></div>
                <div class="mini-stat"><span>Target/person</span><strong>${numberText(program.target_per_participant)}</strong></div>
                <div class="mini-stat"><span>Registration</span><strong>${program.show_on_registration ? "Shown" : "Hidden"}</strong></div>
                <div class="mini-stat"><span>Utility fee</span><strong>${program.utility_bag_available ? `Rs ${numberText(program.utility_bag_fee)}` : "Not offered"}</strong></div>
            </div>
            <div class="card-actions">
                <button class="secondary-button" type="button" data-edit-program="${escapeHtml(program.id)}">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
                <button class="${program.is_active ? "danger-button" : "primary-button"}" type="button"
                    data-toggle-program="${escapeHtml(program.id)}" data-program-active="${program.is_active}">
                    <i class="fa-solid ${program.is_active ? "fa-pause" : "fa-play"}"></i>
                    ${program.is_active ? "Disable" : "Enable"}
                </button>
            </div>
        </article>
    `;
}

export function renderSettings(container, programs) {
    container.innerHTML = programs.length
        ? `<div class="programmes-grid">${programs.map(programCard).join("")}</div>`
        : `<div class="empty-state"><i class="fa-solid fa-sliders"></i><strong>No programs configured</strong><div>Add the first registration program.</div></div>`;
}
