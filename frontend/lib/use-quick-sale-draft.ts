"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveTierPrice } from "@/lib/orders";
import type { Product } from "@/lib/products";
import {
	addDraftLine,
	checkoutDraft,
	closeDraft,
	createDraft,
	getCurrentDraft,
	joinDraft,
	patchDraftCustomer,
	type QuickSaleDraft,
	removeDraftLine,
	setLineQuantity,
} from "@/lib/tenant-quick-sale-draft-api";
import { useQuickSaleDraftStream } from "@/lib/use-tenant-quick-sale-draft-stream";
import { useUserAuth } from "@/stores/user-auth-store";

export function canApplyQuickSaleDraftResponse(
	currentDraftId: string | null,
	currentGeneration: number,
	expectedDraftId: string,
	expectedGeneration: number,
	nextDraftId: string | null,
): boolean {
	return (
		currentDraftId === expectedDraftId &&
		currentGeneration === expectedGeneration &&
		nextDraftId === expectedDraftId
	);
}

export type QuickSaleDraftStatus =
	| "idle"
	| "loading"
	| "ready"
	| "offline"
	| "errored";

export type QuickSaleDraftSession = {
	draft: QuickSaleDraft | null;
	status: QuickSaleDraftStatus;
	error: string | null;
};

const idleSession: QuickSaleDraftSession = {
	draft: null,
	status: "idle",
	error: null,
};

export type UseQuickSaleDraftOptions = {
	/** Pre-supplied join token (from URL query string on phone). */
	initialJoinToken?: string;
	/**
	 * When true, ensure the desktop has an active draft (creates one if
	 * missing). False = phone join path or read-only.
	 */
	autoCreate?: boolean;
};

function productToAddInput(
	product: Product,
	qty: number,
	idempotencyKey: string,
) {
	return {
		productId: product.id,
		unitId: product.baseUnitId ?? "",
		qty,
		unitPrice: resolveTierPrice(product, qty),
		idempotencyKey,
	};
}

function uuid(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID)
		return crypto.randomUUID();
	return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useQuickSaleDraft(options: UseQuickSaleDraftOptions = {}) {
	const accessToken = useUserAuth((state) => state.accessToken);
	const [session, setSession] = useState<QuickSaleDraftSession>(idleSession);
	const idempotencyKeysRef = useRef<Map<string, string>>(new Map());
	const currentDraftIdRef = useRef<string | null>(null);
	const draftGenerationRef = useRef(0);
	const pendingJoinRef = useRef<string | null>(
		options.initialJoinToken ?? null,
	);

	const replaceDraft = useCallback((next: QuickSaleDraft | null) => {
		currentDraftIdRef.current = next?.id ?? null;
		draftGenerationRef.current += 1;
		setSession((prev) => ({
			draft: next,
			status: next ? "ready" : prev.status,
			error: null,
		}));
	}, []);

	// Initial mount: decide between join (token) vs current/create.
	useEffect(() => {
		if (!accessToken) return;
		let cancelled = false;

		async function bootstrap() {
			setSession((prev) => ({ ...prev, status: "loading", error: null }));
			try {
				const token = pendingJoinRef.current;
				if (token) {
					const joined = await joinDraft(token);
					if (cancelled) return;
					if ("error" in joined) {
						setSession({
							draft: null,
							status: "errored",
							error: joined.error.message,
						});
						return;
					}
					pendingJoinRef.current = null;
					replaceDraft(joined);
					return;
				}
				if (options.autoCreate) {
					const existing = await getCurrentDraft();
					if (cancelled) return;
					if (existing) {
						replaceDraft(existing);
						return;
					}
				}
				if (options.autoCreate) {
					const created = await createDraft();
					if (cancelled) return;
					replaceDraft(created);
				} else {
					const existing = await getCurrentDraft();
					if (cancelled) return;
					replaceDraft(existing);
				}
			} catch (err) {
				if (cancelled) return;
				setSession({
					draft: null,
					status: "offline",
					error: err instanceof Error ? err.message : "Network error",
				});
			}
		}

		void bootstrap();
		return () => {
			cancelled = true;
		};
	}, [accessToken, options.autoCreate, replaceDraft]);

	// Coalesce bursts from cross-device edits; each refresh still applies the canonical server snapshot.
	const draftId = session.draft?.id ?? null;
	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const refreshInFlightRef = useRef(false);
	const refreshQueuedRef = useRef(false);

	const refreshDraftFromStream = useCallback(async () => {
		if (!accessToken || !draftId) return;
		if (refreshInFlightRef.current) {
			refreshQueuedRef.current = true;
			return;
		}
		const expectedDraftId = draftId;
		const expectedGeneration = draftGenerationRef.current;
		refreshInFlightRef.current = true;
		try {
			const next = await getCurrentDraft();
			if (
				canApplyQuickSaleDraftResponse(
					currentDraftIdRef.current,
					draftGenerationRef.current,
					expectedDraftId,
					expectedGeneration,
					next?.id ?? null,
				)
			)
				replaceDraft(next);
		} catch {
			// Keep last-known state; the stream will retry.
		} finally {
			refreshInFlightRef.current = false;
			if (
				refreshQueuedRef.current &&
				currentDraftIdRef.current === expectedDraftId
			) {
				refreshQueuedRef.current = false;
				void refreshDraftFromStream();
			} else {
				refreshQueuedRef.current = false;
			}
		}
	}, [accessToken, draftId, replaceDraft]);

	const scheduleStreamRefresh = useCallback(() => {
		if (refreshTimerRef.current) return;
		refreshTimerRef.current = setTimeout(() => {
			refreshTimerRef.current = null;
			void refreshDraftFromStream();
		}, 100);
	}, [refreshDraftFromStream]);

	useEffect(
		() => () => {
			if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
		},
		[],
	);

	// SSE: refetch the canonical draft after a short coalescing window.
	useQuickSaleDraftStream(draftId, accessToken, {
		onEvent: (event) => {
			if (event.type === "heartbeat" || event.type === "connected") return;
			scheduleStreamRefresh();
		},
		onError: () => {
			setSession((prev) =>
				prev.draft ? { ...prev, status: "offline" } : prev,
			);
		},
		onOpen: () => {
			setSession((prev) =>
				prev.draft ? { ...prev, status: "ready", error: null } : prev,
			);
		},
	});

	const ensureKey = useCallback((scope: string) => {
		const existing = idempotencyKeysRef.current.get(scope);
		if (existing) return existing;
		const fresh = uuid();
		idempotencyKeysRef.current.set(scope, fresh);
		return fresh;
	}, []);

	const addProduct = useCallback(
		async (product: Product, quantity = 1) => {
			if (!session.draft) return;
			const safeQty = Math.max(1, Math.round(quantity));
			// Each scan/click is a fresh idempotent operation — never reuse the
			// key, otherwise the second scan would replay the first server
			// response and stop bumping qty.
			const response = await addDraftLine(
				session.draft.id,
				productToAddInput(product, safeQty, uuid()),
			);
			replaceDraft(response);
		},
		[session.draft, replaceDraft],
	);

	const setQty = useCallback(
		async (productId: string, qty: number, unitPrice?: number) => {
			if (!session.draft) return;
			// Explicit set-quantity is a single intentional operation; reuse the
			// stable per-product key so retried requests (e.g. network blip)
			// replay the cached snapshot instead of double-applying.
			const key = ensureKey(`qty:${productId}`);
			const response = await setLineQuantity(session.draft.id, productId, {
				qty,
				unitPrice,
				idempotencyKey: key,
			});
			replaceDraft(response);
		},
		[session.draft, ensureKey, replaceDraft],
	);

	const removeLine = useCallback(
		async (productId: string) => {
			if (!session.draft) return;
			const key = ensureKey(`remove:${productId}`);
			const response = await removeDraftLine(session.draft.id, productId, key);
			replaceDraft(response);
		},
		[session.draft, ensureKey, replaceDraft],
	);

	const setCustomer = useCallback(
		async (customerId: string | null) => {
			if (!session.draft) return;
			const key = ensureKey(`customer`);
			const response = await patchDraftCustomer(session.draft.id, {
				idempotencyKey: key,
				...(customerId ? { customerId } : { clearCustomer: true }),
			});
			replaceDraft(response);
		},
		[session.draft, ensureKey, replaceDraft],
	);

	const checkout = useCallback(
		async (input: {
			paymentMethod: "CASH" | "TRANSFER" | "QR" | "DEBT";
			amountPaid: number;
			discountAmount?: number;
		}) => {
			if (!session.draft) throw new Error("No draft");
			const sale = await checkoutDraft(session.draft.id, {
				idempotencyKey: uuid(),
				...input,
			});
			replaceDraft(null);
			return sale;
		},
		[session.draft, replaceDraft],
	);

	const close = useCallback(async () => {
		if (!session.draft) return;
		await closeDraft(session.draft.id);
		replaceDraft(null);
	}, [session.draft, replaceDraft]);

	const refresh = useCallback(async () => {
		const expectedDraftId = currentDraftIdRef.current;
		const expectedGeneration = draftGenerationRef.current;
		const next = await getCurrentDraft();
		if (
			expectedDraftId &&
			canApplyQuickSaleDraftResponse(
				currentDraftIdRef.current,
				draftGenerationRef.current,
				expectedDraftId,
				expectedGeneration,
				next?.id ?? null,
			)
		) {
			replaceDraft(next);
		} else if (!expectedDraftId && currentDraftIdRef.current === null) {
			replaceDraft(next);
		}
	}, [replaceDraft]);

	return useMemo(
		() => ({
			draft: session.draft,
			status: session.status,
			error: session.error,
			joinToken: session.draft?.joinToken ?? null,
			addProduct,
			setQty,
			removeLine,
			setCustomer,
			checkout,
			close,
			refresh,
		}),
		[
			session,
			addProduct,
			setQty,
			removeLine,
			setCustomer,
			checkout,
			close,
			refresh,
		],
	);
}
