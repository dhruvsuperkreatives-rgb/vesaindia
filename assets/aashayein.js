export const SUP_PER_NWPP_BAG = 1;
export const PLASTIC_KG_PER_SUP_BAG = 0.005;
export const CO2_KG_PER_SUP_BAG = 0.033;

export function numberText(value) {
    return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

export function impactFromBags(bags) {
    const safeBags = Math.max(0, Number(bags || 0));
    const supAvoided = safeBags * SUP_PER_NWPP_BAG;
    return {
        bags: safeBags,
        supAvoided,
        plasticKg: supAvoided * PLASTIC_KG_PER_SUP_BAG,
        co2Kg: supAvoided * CO2_KG_PER_SUP_BAG
    };
}

export function formatKg(value) {
    const rounded = Number(value || 0);
    if (rounded >= 1000) return `${numberText((rounded / 1000).toFixed(2))} tonnes`;
    return `${numberText(rounded.toFixed(1))} kg`;
}
