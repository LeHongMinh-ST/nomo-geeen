import { normalizeVietnameseSearch, matchesNormalized } from './vietnamese-search';

describe('normalizeVietnameseSearch', () => {
	it('strips diacritics and folds đ', () => {
		expect(normalizeVietnameseSearch('Đạo ôn')).toBe('dao on');
		expect(normalizeVietnameseSearch('Rầy nâu')).toBe('ray nau');
		expect(normalizeVietnameseSearch('Sâu cuốn lá')).toBe('sau cuon la');
	});

	it('collapses punctuation and whitespace', () => {
		expect(normalizeVietnameseSearch('  Bệnh   khô-vằn!! ')).toBe(
			'benh kho van',
		);
	});

	it('keeps digits', () => {
		expect(normalizeVietnameseSearch('Validacin 3SL')).toBe('validacin 3sl');
	});

	it('returns empty for empty input', () => {
		expect(normalizeVietnameseSearch('')).toBe('');
	});
});

describe('matchesNormalized', () => {
	it('matches an unaccented prefix against an accented name', () => {
		expect(matchesNormalized('Đạo ôn', 'Da')).toBe(true);
		expect(matchesNormalized('Đạo ôn', 'dao on')).toBe(true);
		expect(matchesNormalized('Đạo ôn', 'ĐẠO')).toBe(true);
	});

	it('requires every token to appear', () => {
		expect(matchesNormalized('Đạo ôn lúa', 'dao lua')).toBe(true);
		expect(matchesNormalized('Đạo ôn lúa', 'dao ngo')).toBe(false);
	});

	it('treats an empty query as a match', () => {
		expect(matchesNormalized('Đạo ôn', '   ')).toBe(true);
	});

	it('does not match an empty haystack with a real query', () => {
		expect(matchesNormalized('', 'dao')).toBe(false);
	});
});
