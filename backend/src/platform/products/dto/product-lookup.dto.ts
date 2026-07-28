export interface ProductLookupResponse {
	brands: Array<{ id: string; name: string }>;
	manufacturers: Array<{ id: string; name: string }>;
	units: Array<{ id: string; code: string; name: string }>;
}
