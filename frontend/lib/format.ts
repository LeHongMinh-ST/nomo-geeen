export function formatVND(value: number): string {
	return new Intl.NumberFormat("vi-VN").format(value);
}

/** Định dạng ngày ISO/date-time thành dd/MM/yyyy, giữ nguyên input không hợp lệ. */
export function formatDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
}

/** Định dạng ISO date-time thành dd/MM/yyyy HH:mm. */
export function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	const parts = new Intl.DateTimeFormat("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(date);
	const values = Object.fromEntries(
		parts
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, part.value]),
	);
	return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute}`;
}
