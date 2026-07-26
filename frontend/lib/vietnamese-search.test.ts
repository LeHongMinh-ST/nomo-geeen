import { describe, expect, it } from "vitest";
import {
	matchesVietnamese,
	normalizeVietnameseSearch,
} from "@/lib/vietnamese-search";

describe("normalizeVietnameseSearch", () => {
	it("strips diacritics and folds đ", () => {
		expect(normalizeVietnameseSearch("Đạo ôn")).toBe("dao on");
		expect(normalizeVietnameseSearch("Rầy nâu")).toBe("ray nau");
	});

	it("collapses punctuation", () => {
		expect(normalizeVietnameseSearch(" Khô-vằn!! ")).toBe("kho van");
	});

	it("keeps digits", () => {
		expect(normalizeVietnameseSearch("Validacin 3SL")).toBe("validacin 3sl");
	});
});

describe("matchesVietnamese", () => {
	it("finds Đạo ôn from an unaccented prefix", () => {
		expect(matchesVietnamese("Đạo ôn", "Da")).toBe(true);
		expect(matchesVietnamese("Đạo ôn", "dao on")).toBe(true);
	});

	it("searches across several fragments", () => {
		expect(matchesVietnamese(["Đạo ôn", "cháy lá", null], "chay")).toBe(true);
		expect(matchesVietnamese(["Đạo ôn", undefined], "ray")).toBe(false);
	});

	it("requires every token", () => {
		expect(matchesVietnamese("Đạo ôn lúa", "dao lua")).toBe(true);
		expect(matchesVietnamese("Đạo ôn lúa", "dao ngo")).toBe(false);
	});

	it("treats a blank query as a match", () => {
		expect(matchesVietnamese("Đạo ôn", "  ")).toBe(true);
	});
});
