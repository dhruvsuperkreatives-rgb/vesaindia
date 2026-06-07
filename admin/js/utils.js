export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function numberText(value) {
    return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

export function dateText(value) {
    if (!value) return "Not available";
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(value));
}

export function dateTimeText(value) {
    if (!value) return "Not available";
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

export function safeLink(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith("@")) return `https://instagram.com/${text.slice(1)}`;
    return null;
}

export function organisationInitial(name) {
    return String(name || "O").trim().charAt(0).toUpperCase() || "O";
}

export function progressPercent(achieved, target) {
    const total = Number(target || 0);
    if (total <= 0) return 0;
    return Math.min(100, Math.round((Number(achieved || 0) / total) * 100));
}

export function emptyState(icon, title, copy) {
    return `
        <div class="empty-state">
            <i class="fa-solid ${icon}"></i>
            <strong>${escapeHtml(title)}</strong>
            <div>${escapeHtml(copy)}</div>
        </div>
    `;
}
