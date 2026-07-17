export function formatVND(value: number): string {
	return new Intl.NumberFormat("vi-VN").format(value);
}

/** Định dạng ngày ISO (YYYY-MM-DD) sang dd/MM/yyyy. */
export function formatDate(iso: string): string {
	const [y, m, d] = iso.split("-");
	if (!y || !m || !d) return iso;
	return `${d}/${m}/${y}`;
}
