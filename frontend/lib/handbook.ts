/**
 * Kiểu dữ liệu + mock cho module Sổ tay (base_spec §21 Handbook).
 * FE-only: dữ liệu mẫu tại chỗ, thay bằng API ở task backend.
 *
 * Sổ tay biến kinh nghiệm bán vật tư thành dữ liệu tra cứu tại quầy:
 * người bán chọn/nhập một bệnh → hệ thống gợi ý thuốc phù hợp đang có trong kho.
 *
 * Cơ chế gợi ý (§21.3) kết hợp Auto + Manual, theo thứ tự ưu tiên:
 *  1. Ghim tay (pinnedProductIds) — kinh nghiệm thực tế, lên đầu.
 *  2. Khớp hoạt chất — product.agro.activeIngredient ∈ recommendedIngredients.
 *  3. Khớp tag sâu/bệnh — product.agro.pest chứa tên bệnh/alias.
 * Loại excludedProductIds; còn hàng ưu tiên trước, hết/khóa đẩy xuống cuối.
 */

import {
	getProduct,
	getStockStatus,
	type Product,
	products,
} from "@/lib/products";

/** Mốc "hôm nay" cố định cho mock — khớp docs/currentDate. */
export const TODAY = "2026-07-17";

/**
 * Canonical Handbook category contract (specs/handbook-core-catalog).
 * Not the same as product BusinessGroup (CROP_INPUTS vs advice taxonomy).
 */
export type HandbookCategoryId =
	| "CROP_PROTECTION_AND_FERTILIZER"
	| "CROP_SEEDLINGS"
	| "ANIMAL_FEED"
	| "VETERINARY_DRUGS"
	| "LIVESTOCK"
	| "UNCATEGORIZED";

export type HandbookCategoryOption = {
	id: HandbookCategoryId;
	label: string;
	selectable: boolean;
};

/** Ordered catalog — only source for labels/options (design contract). */
export const HANDBOOK_CATEGORY_CATALOG: readonly HandbookCategoryOption[] = [
	{
		id: "CROP_PROTECTION_AND_FERTILIZER",
		label: "Thuốc bảo vệ thực vật + Phân bón",
		selectable: true,
	},
	{
		id: "CROP_SEEDLINGS",
		label: "Cây giống",
		selectable: true,
	},
	{
		id: "ANIMAL_FEED",
		label: "Thức ăn chăn nuôi",
		selectable: true,
	},
	{
		id: "VETERINARY_DRUGS",
		label: "Thuốc thú y",
		selectable: true,
	},
	{
		id: "LIVESTOCK",
		label: "Con giống",
		selectable: true,
	},
	{
		id: "UNCATEGORIZED",
		label: "Chưa phân loại",
		selectable: false,
	},
] as const;

export const SELECTABLE_HANDBOOK_CATEGORY_IDS =
	HANDBOOK_CATEGORY_CATALOG.filter((c) => c.selectable).map((c) => c.id);

const categoryById = Object.fromEntries(
	HANDBOOK_CATEGORY_CATALOG.map((c) => [c.id, c]),
) as Record<HandbookCategoryId, HandbookCategoryOption>;

export function getHandbookCategory(
	id: string | null | undefined,
): HandbookCategoryOption {
	if (id && id in categoryById) return categoryById[id as HandbookCategoryId];
	return categoryById.UNCATEGORIZED;
}

export function handbookCategoryLabel(id: string | null | undefined): string {
	return getHandbookCategory(id).label;
}

/** Prisma AgriDomain → Handbook category (lossless fallback UNCATEGORIZED). */
export type LegacyAgriDomain =
	| "CROP"
	| "LIVESTOCK"
	| "AQUACULTURE"
	| "GENERAL"
	| string;

export function mapLegacyAgriDomain(
	domain: LegacyAgriDomain | null | undefined,
): HandbookCategoryId {
	switch (domain) {
		case "CROP":
			return "CROP_PROTECTION_AND_FERTILIZER";
		case "LIVESTOCK":
			return "VETERINARY_DRUGS";
		case "AQUACULTURE":
		case "GENERAL":
		case null:
		case undefined:
			return "UNCATEGORIZED";
		default:
			return "UNCATEGORIZED";
	}
}

/** @deprecated Use HandbookCategoryId — kept for gradual UI migration. */
export type HandbookField = "cultivation" | "livestock" | "aquaculture";

export function mapLegacyHandbookField(
	field: HandbookField | string | null | undefined,
): HandbookCategoryId {
	switch (field) {
		case "cultivation":
			return "CROP_PROTECTION_AND_FERTILIZER";
		case "livestock":
			return "VETERINARY_DRUGS";
		case "aquaculture":
			return "UNCATEGORIZED";
		default:
			return getHandbookCategory(field as string).id;
	}
}

/** Loại vấn đề trong Sổ tay (§21.2). */
export type DiseaseType = "disease" | "pest" | "weed" | "epidemic";

/** Lý do một sản phẩm được gợi ý (để hiển thị + xếp hạng). */
export type SuggestReason = "pinned" | "ingredient" | "pest";

export type Disease = {
	id: string;
	/** Mã sổ tay tự sinh (ST-xxx). */
	code: string;
	name: string;
	/** Tên gọi khác / từ khóa tìm — gõ kiểu gì cũng ra. */
	aliases: string[];
	/** Canonical Handbook category (five core + UNCATEGORIZED). */
	category: HandbookCategoryId;
	/**
	 * @deprecated Prefer `category`. Kept for older call sites during migration.
	 */
	field?: HandbookField;
	/** Đối tượng cụ thể: Lúa, Bắp, Lợn, Gà, Tôm, Cá... */
	subject: string;
	type: DiseaseType;
	/** Triệu chứng ngắn, ngôn ngữ đời thường. */
	symptom: string;
	/** Hoạt chất khuyến nghị trị bệnh này (khớp product.agro.activeIngredient). */
	recommendedIngredients: string[];
	/** Kinh nghiệm liều dùng của chủ cửa hàng. */
	dosage?: string;
	/** Thời điểm sử dụng. */
	timing?: string;
	/** Lưu ý / ghi chú thêm. */
	note?: string;
	/** Sản phẩm ghim tay — luôn lên đầu gợi ý. */
	pinnedProductIds: string[];
	/** Sản phẩm chủ cửa hàng loại khỏi gợi ý. */
	excludedProductIds: string[];
	updatedBy: string;
	updatedAt: string;
};

export const fieldLabel: Record<HandbookField, string> = {
	cultivation: "Trồng trọt",
	livestock: "Chăn nuôi",
	aquaculture: "Thủy sản",
};

/** Labels from canonical catalog only. */
export const categoryLabel: Record<HandbookCategoryId, string> =
	Object.fromEntries(
		HANDBOOK_CATEGORY_CATALOG.map((c) => [c.id, c.label]),
	) as Record<HandbookCategoryId, string>;

/** Class badge lĩnh vực (DESIGN.md §13 — nền + chữ, không chỉ màu). */
export const fieldBadgeClass: Record<HandbookField, string> = {
	cultivation: "bg-[#e8f5e9] text-[#2e7d32]",
	livestock: "bg-[#fff3e0] text-[#e65100]",
	aquaculture: "bg-[#e3f2fd] text-[#1565c0]",
};

export const categoryBadgeClass: Record<HandbookCategoryId, string> = {
	CROP_PROTECTION_AND_FERTILIZER: "bg-[#e8f5e9] text-[#2e7d32]",
	CROP_SEEDLINGS: "bg-[#f1f8e9] text-[#558b2f]",
	ANIMAL_FEED: "bg-[#fff8e1] text-[#f57f17]",
	VETERINARY_DRUGS: "bg-[#fff3e0] text-[#e65100]",
	LIVESTOCK: "bg-[#fce4ec] text-[#ad1457]",
	UNCATEGORIZED: "bg-[#eceff1] text-[#546e7a]",
};

export const typeLabel: Record<DiseaseType, string> = {
	disease: "Bệnh",
	pest: "Sâu hại",
	weed: "Cỏ dại",
	epidemic: "Dịch bệnh",
};

/** Class badge loại vấn đề (nền nhạt + chữ trung tính). */
export const typeBadgeClass: Record<DiseaseType, string> = {
	disease: "bg-[#f3e5f5] text-[#6a1b9a]",
	pest: "bg-[#fff8e1] text-[#f57f17]",
	weed: "bg-[#e0f2f1] text-[#00695c]",
	epidemic: "bg-[#ffebee] text-[#c62828]",
};

export const suggestReasonLabel: Record<SuggestReason, string> = {
	pinned: "Ghim tay",
	ingredient: "Khớp hoạt chất",
	pest: "Khớp sâu/bệnh",
};

/* ------------------------------- Selectors ------------------------------- */

export type Suggestion = {
	product: Product;
	reason: SuggestReason;
};

const reasonRank: Record<SuggestReason, number> = {
	pinned: 0,
	ingredient: 1,
	pest: 2,
};

function norm(text: string): string {
	return text.trim().toLowerCase();
}

/**
 * Gợi ý thuốc cho một bệnh (base_spec §21.3).
 * Ghim tay → khớp hoạt chất → khớp tag pest; trong cùng bậc, còn hàng lên trước.
 * Loại sản phẩm bị ẩn (excluded); hết hàng / bị khóa đẩy xuống cuối, không loại hẳn
 * để chủ cửa hàng vẫn thấy "có thuốc nhưng đang hết".
 */
export function suggestProducts(disease: Disease): Suggestion[] {
	const excluded = new Set(disease.excludedProductIds);
	const ingredients = disease.recommendedIngredients.map(norm);
	const keywords = [disease.name, ...disease.aliases].map(norm);

	const seen = new Set<string>();
	const result: Suggestion[] = [];

	// 1. Ghim tay — giữ đúng thứ tự chủ cửa hàng đã ghim.
	for (const id of disease.pinnedProductIds) {
		if (excluded.has(id) || seen.has(id)) continue;
		const product = getProduct(id);
		if (!product) continue;
		seen.add(id);
		result.push({ product, reason: "pinned" });
	}

	// 2 + 3. Khớp tự động theo hoạt chất, rồi theo tag sâu/bệnh.
	for (const product of products) {
		if (excluded.has(product.id) || seen.has(product.id)) continue;
		const agro = product.agro;
		if (!agro) continue;

		const ingredient = agro.activeIngredient ? norm(agro.activeIngredient) : "";
		const matchIngredient =
			ingredient !== "" && ingredients.includes(ingredient);

		const pestText = agro.pest ? norm(agro.pest) : "";
		const matchPest =
			pestText !== "" &&
			keywords.some((kw) => kw !== "" && pestText.includes(kw));

		if (matchIngredient) {
			seen.add(product.id);
			result.push({ product, reason: "ingredient" });
		} else if (matchPest) {
			seen.add(product.id);
			result.push({ product, reason: "pest" });
		}
	}

	return result.sort((a, b) => {
		const ra = reasonRank[a.reason];
		const rb = reasonRank[b.reason];
		if (ra !== rb) return ra - rb;
		// Cùng bậc: còn hàng trước, hết/khóa xuống cuối.
		return stockRank(a.product) - stockRank(b.product);
	});
}

/** 0 = còn bán được (ưu tiên), 1 = hết hàng / bị khóa (đẩy xuống). */
function stockRank(product: Product): number {
	if (product.locked) return 1;
	return getStockStatus(product) === "out-of-stock" ? 1 : 0;
}

/** Số thuốc gợi ý đang còn bán được (còn hàng, không khóa). */
export function availableSuggestionCount(disease: Disease): number {
	return suggestProducts(disease).filter((s) => stockRank(s.product) === 0)
		.length;
}

export function getDisease(id: string): Disease | undefined {
	return handbookDiseases.find((d) => d.id === id);
}

/* --------------------------------- Mock ---------------------------------- */

/**
 * Bộ bệnh phổ biến seed sẵn, phủ 5 danh mục Handbook (legacy aquaculture → UNCATEGORIZED) (§21.2).
 * Hoạt chất khớp products.ts: Fipronil→Regent (p2), Paraquat→Gramoxone (p4).
 * Các bệnh chăn nuôi/thủy sản dùng ghim tay minh họa (kho chưa có agro tương ứng).
 */
export const handbookDiseases: Disease[] = [
	{
		id: "st-daoon",
		code: "ST-001",
		name: "Đạo ôn",
		aliases: ["cháy lá", "đạo ôn lá", "blast"],
		category: "CROP_PROTECTION_AND_FERTILIZER",
		subject: "Lúa",
		type: "disease",
		symptom:
			"Vết bệnh hình thoi, tâm xám tro, viền nâu; nặng thì lá cháy khô, bông lép.",
		recommendedIngredients: ["Tricyclazole", "Isoprothiolane"],
		dosage: "Pha 1 gói/bình 16L, phun ướt đều tán lá.",
		timing: "Phun khi vết bệnh mới chớm, sáng sớm hoặc chiều mát.",
		note: "Ngưng bón đạm khi đang bệnh; giữ mực nước ruộng ổn định.",
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-10",
	},
	{
		id: "st-raynau",
		code: "ST-002",
		name: "Rầy nâu",
		aliases: ["rầy", "rầy nâu hại lúa", "cháy rầy"],
		category: "CROP_PROTECTION_AND_FERTILIZER",
		subject: "Lúa",
		type: "pest",
		symptom:
			"Rầy chích hút gốc lúa, cây vàng lụi từng chòm (cháy rầy); truyền bệnh vàng lùn.",
		recommendedIngredients: ["Fipronil", "Pymetrozine"],
		dosage: "1 gói Regent/bình 16L, phun vào gốc nơi rầy trú.",
		timing: "Phun khi rầy tuổi 2–3, mật độ cao; tránh phun lúc trổ.",
		note: "Rẽ hàng lúa để thuốc xuống gốc; luân phiên hoạt chất tránh kháng.",
		pinnedProductIds: ["p2"],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-12",
	},
	{
		id: "st-saucuonla",
		code: "ST-003",
		name: "Sâu cuốn lá",
		aliases: ["sâu cuốn lá nhỏ", "cuốn lá"],
		category: "CROP_PROTECTION_AND_FERTILIZER",
		subject: "Lúa",
		type: "pest",
		symptom:
			"Sâu nhả tơ cuốn lá thành ống, ăn phần thịt lá để lại lớp biểu bì trắng.",
		recommendedIngredients: ["Fipronil", "Chlorantraniliprole"],
		dosage: "1 gói/bình 16L khi sâu tuổi nhỏ.",
		timing: "Phun lúc sâu mới nở, chưa cuốn lá kín.",
		note: "Thăm đồng định kỳ; kết hợp bẫy đèn theo dõi bướm.",
		pinnedProductIds: ["p2"],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-11",
	},
	{
		id: "st-codai",
		code: "ST-004",
		name: "Cỏ dại ruộng cạn",
		aliases: ["cỏ", "diệt cỏ", "cỏ lồng vực"],
		category: "CROP_PROTECTION_AND_FERTILIZER",
		subject: "Cây trồng cạn",
		type: "weed",
		symptom: "Cỏ mọc dày tranh dinh dưỡng, che sáng cây trồng non.",
		recommendedIngredients: ["Paraquat", "Glyphosate"],
		dosage: "Pha theo tỷ lệ trên nhãn, phun trùm lên cỏ.",
		timing: "Phun khi cỏ đang sinh trưởng mạnh, trời khô ráo.",
		note: "Tránh phun dính cây trồng; mang đồ bảo hộ đầy đủ.",
		pinnedProductIds: ["p4"],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-09",
	},
	{
		id: "st-vangla",
		code: "ST-005",
		name: "Vàng lá gân xanh",
		aliases: ["greening", "vàng lá cam", "HLB"],
		category: "CROP_PROTECTION_AND_FERTILIZER",
		subject: "Cam quýt",
		type: "disease",
		symptom: "Lá vàng loang lổ nhưng gân còn xanh, trái méo lệch, cây suy dần.",
		recommendedIngredients: ["Imidacloprid"],
		dosage: "Phun trừ rầy chổng cánh môi giới truyền bệnh.",
		timing: "Phun đợt lộc non — nơi rầy đẻ trứng.",
		note: "Chưa có thuốc đặc trị; chặn môi giới + loại cây bệnh nặng.",
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-08",
	},
	{
		id: "st-suongmai",
		code: "ST-006",
		name: "Sương mai",
		aliases: ["mốc sương", "downy mildew"],
		category: "CROP_PROTECTION_AND_FERTILIZER",
		subject: "Rau màu",
		type: "disease",
		symptom:
			"Mặt trên lá đốm vàng, mặt dưới lớp mốc trắng xám; lan nhanh khi ẩm.",
		recommendedIngredients: ["Mancozeb", "Metalaxyl"],
		dosage: "Phun phòng định kỳ 7–10 ngày/lần lúc thời tiết ẩm.",
		timing: "Phun sáng sớm khi sương chưa tan hoặc chiều mát.",
		note: "Thoát nước tốt, tỉa lá cho thông thoáng.",
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-07",
	},
	{
		id: "st-dichta-lon",
		code: "ST-007",
		name: "Dịch tả lợn",
		aliases: ["dịch tả heo", "tả lợn châu Phi", "ASF"],
		category: "VETERINARY_DRUGS",
		subject: "Lợn",
		type: "epidemic",
		symptom:
			"Lợn sốt cao, bỏ ăn, da đỏ tím vùng tai bụng, chết nhanh hàng loạt.",
		recommendedIngredients: [],
		dosage: "Không có thuốc đặc trị — tập trung phòng & sát trùng.",
		timing: "Sát trùng chuồng trại định kỳ, cách ly con bệnh ngay.",
		note: "Báo thú y khi nghi dịch; tiêu độc, không bán chạy lợn bệnh.",
		pinnedProductIds: ["p6"],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-13",
	},
	{
		id: "st-cumga",
		code: "ST-008",
		name: "Cúm gia cầm",
		aliases: ["cúm gà", "H5N1", "cúm vịt"],
		category: "VETERINARY_DRUGS",
		subject: "Gà, vịt",
		type: "epidemic",
		symptom:
			"Gia cầm ủ rũ, khó thở, mào tím, chảy nước mắt mũi, chết đột ngột.",
		recommendedIngredients: [],
		dosage: "Không điều trị — phòng bằng vaccine + vệ sinh.",
		timing: "Tiêm phòng theo lịch; sát trùng chuồng thường xuyên.",
		note: "Bệnh lây sang người — báo thú y, không giết mổ gia cầm bệnh.",
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-06",
	},
	{
		id: "st-tuhuyettrung",
		code: "ST-009",
		name: "Tụ huyết trùng",
		aliases: ["tụ huyết trùng trâu bò", "bệnh toi"],
		category: "VETERINARY_DRUGS",
		subject: "Trâu, bò",
		type: "disease",
		symptom:
			"Sốt cao đột ngột, sưng hầu, khó thở, chảy dãi; diễn biến cấp tính.",
		recommendedIngredients: ["Oxytetracycline", "Streptomycin"],
		dosage: "Tiêm kháng sinh theo trọng lượng, đủ liệu trình.",
		timing: "Điều trị sớm khi con vật mới sốt; tiêm phòng trước mùa mưa.",
		note: "Cách ly con bệnh; vệ sinh máng ăn uống.",
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-05",
	},
	{
		id: "st-domtrang-tom",
		code: "ST-010",
		name: "Đốm trắng ở tôm",
		aliases: ["bệnh đốm trắng", "WSSV", "white spot"],
		category: "UNCATEGORIZED",
		subject: "Tôm",
		type: "epidemic",
		symptom:
			"Tôm dạt bờ, vỏ có đốm trắng tròn, đỏ thân, chết nhanh trong 3–5 ngày.",
		recommendedIngredients: [],
		dosage: "Không có thuốc đặc trị — quản lý ao & tăng đề kháng.",
		timing: "Diệt khuẩn nước cấp, ổn định môi trường ao nuôi.",
		note: "Chọn giống sạch bệnh; hạn chế thay nước khi có dịch quanh vùng.",
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-14",
	},
	{
		id: "st-ganthantom",
		code: "ST-011",
		name: "Hoại tử gan tụy cấp",
		aliases: ["gan tụy", "EMS", "AHPND", "phân trắng"],
		category: "UNCATEGORIZED",
		subject: "Tôm",
		type: "disease",
		symptom: "Tôm bỏ ăn, gan tụy nhợt teo, ruột rỗng; tôm nhỏ chết đáy ao.",
		recommendedIngredients: [],
		dosage: "Bổ sung men vi sinh, khoáng; giảm cho ăn khi bệnh.",
		timing: "Xử lý sớm giai đoạn 20–45 ngày tuổi.",
		note: "Kiểm soát Vibrio; quản lý đáy ao và thức ăn dư.",
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-12",
	},
	{
		id: "st-xuathuyet-ca",
		code: "ST-012",
		name: "Xuất huyết ở cá",
		aliases: ["đốm đỏ", "xuất huyết cá tra", "lở loét"],
		category: "UNCATEGORIZED",
		subject: "Cá",
		type: "disease",
		symptom:
			"Cá lờ đờ, gốc vây và hậu môn đỏ, xuất huyết dưới da, có vết loét.",
		recommendedIngredients: ["Florfenicol", "Doxycycline"],
		dosage: "Trộn kháng sinh vào thức ăn theo trọng lượng cá.",
		timing: "Cho ăn thuốc 5–7 ngày khi cá mới chớm bệnh.",
		note: "Cải thiện chất lượng nước; giảm mật độ nuôi.",
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-11",
	},
	{
		id: "st-giong-lua",
		code: "ST-013",
		name: "Chọn giống lúa vụ ĐX",
		aliases: ["giống lúa", "lúa lai"],
		category: "CROP_SEEDLINGS",
		subject: "Lúa",
		type: "disease",
		symptom: "Tư vấn chọn giống theo vụ/mùa, mật độ gieo.",
		recommendedIngredients: [],
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-15",
	},
	{
		id: "st-cam-heo",
		code: "ST-014",
		name: "Chọn cám heo giai đoạn vỗ béo",
		aliases: ["thức ăn heo", "cám"],
		category: "ANIMAL_FEED",
		subject: "Lợn",
		type: "disease",
		symptom: "Tư vấn khẩu phần theo giai đoạn sinh trưởng.",
		recommendedIngredients: [],
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-15",
	},
	{
		id: "st-heo-giong",
		code: "ST-015",
		name: "Chọn heo giống hậu bị",
		aliases: ["heo giống", "con giống"],
		category: "LIVESTOCK",
		subject: "Lợn",
		type: "disease",
		symptom: "Tiêu chuẩn giống, tuổi, sức khỏe khi nhập.",
		recommendedIngredients: [],
		pinnedProductIds: [],
		excludedProductIds: [],
		updatedBy: "Minh Tâm",
		updatedAt: "2026-07-15",
	},
];
