import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTenantNotificationStream } from "./use-tenant-notification-stream";

const subscribeMock = vi.fn();

vi.mock("@/lib/tenant-notification-stream", () => ({
	subscribeTenantNotificationStream: (...args: unknown[]) =>
		subscribeMock(...args),
}));

describe("useTenantNotificationStream", () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it("subscribes with token, forwards changed events, cleans up on unmount", async () => {
		let handlers: {
			onEvent?: (e: { type: string }) => void;
			onOpen?: () => void;
			onError?: () => void;
		} = {};
		const close = vi.fn();
		subscribeMock.mockImplementation((_opts, h) => {
			handlers = h;
			return { close };
		});

		const onChanged = vi.fn();
		const onReconnect = vi.fn();
		const { unmount } = renderHook(() =>
			useTenantNotificationStream({
				accessToken: "tok",
				enabled: true,
				onChanged,
				onReconnect,
				fallbackPollMs: 0,
			}),
		);

		expect(subscribeMock).toHaveBeenCalledWith(
			expect.objectContaining({ accessToken: "tok" }),
			expect.any(Object),
		);

		handlers.onOpen?.();
		expect(onReconnect).toHaveBeenCalled();

		handlers.onEvent?.({ type: "heartbeat" });
		expect(onChanged).not.toHaveBeenCalled();

		handlers.onEvent?.({ type: "notification.changed" });
		expect(onChanged).toHaveBeenCalledTimes(1);

		unmount();
		expect(close).toHaveBeenCalled();
	});

	it("starts polling fallback on stream error and stops after open", async () => {
		vi.useFakeTimers();
		let handlers: {
			onEvent?: (e: { type: string }) => void;
			onOpen?: () => void;
			onError?: () => void;
		} = {};
		subscribeMock.mockImplementation((_opts, h) => {
			handlers = h;
			return { close: vi.fn() };
		});

		const onChanged = vi.fn();
		renderHook(() =>
			useTenantNotificationStream({
				accessToken: "tok",
				onChanged,
				fallbackPollMs: 1000,
			}),
		);

		// Immediate poll path while unhealthy.
		handlers.onError?.();
		await vi.advanceTimersByTimeAsync(1000);
		expect(onChanged).toHaveBeenCalled();

		const countAfterError = onChanged.mock.calls.length;
		handlers.onOpen?.();
		await vi.advanceTimersByTimeAsync(3000);
		// Healthy stream: polling stopped.
		expect(onChanged.mock.calls.length).toBe(countAfterError);
	});

	it("does not subscribe without token", () => {
		renderHook(() =>
			useTenantNotificationStream({
				accessToken: null,
				onChanged: vi.fn(),
			}),
		);
		expect(subscribeMock).not.toHaveBeenCalled();
	});
});
