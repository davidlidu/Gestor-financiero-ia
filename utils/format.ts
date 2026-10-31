export const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// YYYY-MM-DD en la hora del dispositivo (toISOString usa UTC y en Colombia adelanta un día desde las 7 p. m.)
export const localDateStr = (d: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
