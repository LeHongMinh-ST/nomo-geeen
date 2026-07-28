"use client";

import { SettingHeader } from "@/components/app/setting-header";
import { PasskeySettings } from "@/components/auth/passkey-settings";

/** Màn quản lý bảo mật và thiết bị đăng nhập sinh trắc học. */
export default function BaoMatPage() {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:mx-0">
			<SettingHeader
				title="Thiết bị đăng nhập"
				description="Quản lý Face ID, Touch ID và các passkey của bạn."
			/>

			<PasskeySettings />
		</div>
	);
}
