"use client";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	canUsePasskey,
	isPasskeyCacheFresh,
	registerPasskey,
} from "@/lib/passkey";
import {
	listPasskeys,
	passkeyRegistrationOptions,
	passkeyRegistrationVerify,
	revokePasskey,
} from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

type Options = { challengeId: string; options: unknown; expiresAt: number };
export function PasskeySettings() {
	const token = useUserAuth((s) => s.accessToken);
	const [available, setAvailable] = useState(false);
	const [refreshNonce, setRefreshNonce] = useState(0);
	const prefetchRequest = useMemo(
		() => ({ token, generation: refreshNonce }),
		[token, refreshNonce],
	);
	const [items, setItems] = useState<
		Array<{ id: string; label: string | null }>
	>([]);
	const [cached, setCached] = useState<Options | null>(null);
	const [preparing, setPreparing] = useState(false);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	useEffect(() => {
		let active = true;
		void (async () => {
			if (!(await canUsePasskey())) {
				if (active) setAvailable(false);
				return;
			}
			if (active) setAvailable(true);
			if (!prefetchRequest.token) return;
			setPreparing(true);
			try {
				const next = await passkeyRegistrationOptions(prefetchRequest.token);
				if (active) setCached({ ...next, expiresAt: Date.now() + 290000 });
				const list = await listPasskeys(prefetchRequest.token);
				if (active) setItems(list);
			} catch {
				if (active) setMessage("Chưa chuẩn bị được đăng nhập sinh trắc học.");
			} finally {
				if (active) setPreparing(false);
			}
		})();
		return () => {
			active = false;
		};
	}, [prefetchRequest]);
	async function enable() {
		if (!token) return;
		const ready = cached;
		if (!ready || !isPasskeyCacheFresh(ready)) {
			setCached(null);
			setMessage(
				ready
					? "Phiên chuẩn bị đã hết hạn, vui lòng bấm lại"
					: "Đang chuẩn bị đăng ký. Vui lòng bấm lại sau giây lát.",
			);
			return;
		}
		setBusy(true);
		setMessage("");
		try {
			const response = await registerPasskey(ready.options);
			await passkeyRegistrationVerify(token, ready.challengeId, response);
			setMessage("Đã bật đăng nhập bằng Face ID hoặc sinh trắc học.");
		} catch (e) {
			setMessage(e instanceof Error ? e.message : "Không thể bật passkey.");
		} finally {
			setCached(null);
			setRefreshNonce((value) => value + 1);
			setBusy(false);
		}
	}
	async function revoke(id: string) {
		if (!token) return;
		setBusy(true);
		try {
			await revokePasskey(token, id);
			setItems(items.filter((x) => x.id !== id));
			setMessage("Đã thu hồi thiết bị.");
		} catch (e) {
			setMessage(
				e instanceof Error ? e.message : "Không thể thu hồi thiết bị.",
			);
		} finally {
			setBusy(false);
		}
	}
	if (!available) return null;
	return (
		<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
			<div>
				<h2 className="text-lg font-semibold text-foreground">
					Đăng nhập sinh trắc học
				</h2>
				<p className="text-base text-muted-foreground">
					Dùng Face ID, Touch ID hoặc sinh trắc học của thiết bị. NomoGreen
					không lưu ảnh khuôn mặt.
				</p>
			</div>
			<button
				type="button"
				onClick={enable}
				disabled={busy || preparing}
				className="flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-base font-semibold text-white disabled:opacity-70"
			>
				{busy || preparing ? (
					<LoaderCircle className="size-5 animate-spin" />
				) : (
					<Fingerprint className="size-5" />
				)}
				{preparing ? "Đang chuẩn bị…" : "Bật đăng nhập bằng Face ID"}
			</button>
			{items.map((item) => (
				<div
					key={item.id}
					className="flex min-h-12 items-center justify-between gap-3 border-t border-border pt-3"
				>
					<span className="text-base">
						{item.label || "Thiết bị đã đăng ký"}
					</span>
					<button
						type="button"
						onClick={() => void revoke(item.id)}
						disabled={busy}
						className="min-h-12 rounded-[10px] px-3 text-base font-semibold text-destructive"
					>
						Thu hồi
					</button>
				</div>
			))}
			{message ? (
				<p role="status" className="text-base text-muted-foreground">
					{message}
				</p>
			) : null}
		</section>
	);
}
