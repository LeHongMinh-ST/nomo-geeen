export interface ProductLookupResponse {
	categories: Array<{ id: string; name: string }>;
	brands: Array<{ id: string; name: string }>;
	manufacturers: Array<{ id: string; name: string }>;
	units: Array<{ id: string; code: string; name: string }>;
}
