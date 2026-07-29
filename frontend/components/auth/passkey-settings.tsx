"use client";
import {
	Fingerprint,
	LoaderCircle,
	MonitorSmartphone,
	ScanFace,
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	canUsePasskey,
	isPasskeyCacheFresh,
	passkeyBiometricKind,
	passkeyDeviceLabel,
	registerPasskey,
} from "@/lib/passkey";
import {
	listPasskeys,
	passkeyRegistrationOptions,
	passkeyRegistrationVerify,
	revokePasskey,
} from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";
import { formatDateTime } from "@/lib/format";

type Options = { challengeId: string; options: unknown; expiresAt: number };
type PasskeyItem = {
	id: string;
	label: string | null;
	deviceType: string | null;
	backedUp: boolean;
	createdAt: string;
	lastUsedAt: string | null;
};

function passkeyIcon(label: string | null) {
	if (label?.includes("Face ID")) return ScanFace;
	if (label?.includes("Touch ID")) return Fingerprint;
	return MonitorSmartphone;
}

function formatDate(value: string | null) {
	if (!value) return "Chưa sử dụng";
	return formatDateTime(value);
}

export function PasskeySettings() {
	const token = useUserAuth((s) => s.accessToken);
	const biometricKind = passkeyBiometricKind();
	const BiometricIcon = biometricKind === "face" ? ScanFace : Fingerprint;
	const [available, setAvailable] = useState(false);
	const [refreshNonce, setRefreshNonce] = useState(0);
	const prefetchRequest = useMemo(
		() => ({ token, generation: refreshNonce }),
		[token, refreshNonce],
	);
	const [items, setItems] = useState<
		PasskeyItem[]
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
			} catch (error) {
				if (active) {
					setMessage(
						error instanceof Error
							? error.message
							: "Chưa chuẩn bị được đăng nhập sinh trắc học.",
					);
				}
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
			setRefreshNonce((value) => value + 1);
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
			await passkeyRegistrationVerify(
				token,
				ready.challengeId,
				response,
				passkeyDeviceLabel(),
			);
			setMessage("Đã đăng ký thiết bị đăng nhập.");
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
					Thiết bị đăng nhập
				</h2>
				<p className="text-base text-muted-foreground">
					Đăng ký nhiều thiết bị bằng Face ID, Touch ID hoặc sinh trắc học.
					NomoGreen không lưu ảnh khuôn mặt.
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
					<BiometricIcon className="size-5" aria-hidden />
				)}
				{preparing ? "Đang chuẩn bị…" : "Đăng ký thiết bị này"}
			</button>
			{items.map((item) => (
				<div
					key={item.id}
					className="flex items-start gap-3 border-t border-border pt-4"
				>
					<span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f5e9] text-primary">
						{(() => {
							const Icon = passkeyIcon(item.label);
							return <Icon className="size-5.5" aria-hidden />;
						})()}
					</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-base font-semibold text-foreground">
							{item.label || "Thiết bị đã đăng ký"}
						</p>
						<p className="text-sm text-muted-foreground">
							Đăng ký: {formatDate(item.createdAt)}
						</p>
						<p className="text-sm text-muted-foreground">
							Dùng gần nhất: {formatDate(item.lastUsedAt)}
						</p>
						<p className="text-sm text-[#2e7d32]">
							{item.backedUp ? "Đã đồng bộ" : "Lưu trên thiết bị này"}
						</p>
					</div>
					<button
						type="button"
						onClick={() => void revoke(item.id)}
						disabled={busy}
						aria-label={`Thu hồi ${item.label || "thiết bị"}`}
						className="flex min-h-12 shrink-0 items-center gap-1 rounded-[10px] px-2 text-sm font-semibold text-destructive"
					>
						<Trash2 className="size-4" aria-hidden />
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
