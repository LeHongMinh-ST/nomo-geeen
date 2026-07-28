import { afterEach, describe, expect, it, vi } from "vitest";
import {
	consumeSseBuffer,
	parseSseBlock,
	subscribeTenantNotificationStream,
} from "./tenant-notification-stream";

describe("parseSseBlock / consumeSseBuffer", () => {
	it("parses JSON data events", () => {
		const event = parseSseBlock(
			'data: {"type":"notification.changed","action":"created","notificationId":"n1","audience":"TENANT","at":"2026-07-28T00:00:00.000Z"}',
		);
		expect(event).toMatchObject({
			type: "notification.changed",
			notificationId: "n1",
			audience: "TENANT",
		});
	});

	it("handles heartbeat event type without data", () => {
		const event = parseSseBlock("event: heartbeat\n");
		expect(event?.type).toBe("heartbeat");
	});

	it("consumes complete blocks and keeps incomplete tail", () => {
		const events: unknown[] = [];
		const rest = consumeSseBuffer(
			'data: {"type":"connected","at":"t1"}\n\ndata: {"type":"heartbeat","at":"t2"}\n\ndata: {"type":"notification.changed"',
			(e) => events.push(e),
		);
		expect(events).toHaveLength(2);
		expect(events[0]).toMatchObject({ type: "connected" });
		expect(events[1]).toMatchObject({ type: "heartbeat" });
		expect(rest.startsWith("data:")).toBe(true);
	});
});

describe("subscribeTenantNotificationStream", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sends Authorization Bearer and never puts token in URL", async () => {
		const encoder = new TextEncoder();
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(
					encoder.encode(
						'data: {"type":"connected","at":"t0"}\n\ndata: {"type":"notification.changed","action":"created","notificationId":"n1","audience":"TENANT","at":"t1"}\n\n',
					),
				);
				// Do not close — keep open so reconnect loop does not spin.
			},
		});

		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
			body,
			status: 200,
		});

		const events: string[] = [];
		const handle = subscribeTenantNotificationStream(
			{
				accessToken: "secret-token",
				apiBase: "http://api.test",
				fetchImpl: fetchImpl as unknown as typeof fetch,
				// Large delay so any accidental reconnect cannot OOM the suite.
				retryBaseMs: 60_000,
				retryMaxMs: 60_000,
				sleep: () => new Promise(() => undefined),
			},
			{
				onEvent: (e) => events.push(e.type),
			},
		);

		await vi.waitFor(() => {
			expect(events).toContain("notification.changed");
		});

		expect(fetchImpl).toHaveBeenCalled();
		const [url, init] = fetchImpl.mock.calls[0] as [
			string,
			RequestInit & { headers: Record<string, string> },
		];
		expect(url).toBe("http://api.test/tenant/notifications/stream");
		expect(url).not.toContain("secret-token");
		expect(url).not.toContain("token=");
		expect(init.headers.Authorization).toBe("Bearer secret-token");
		expect(init.headers.Accept).toBe("text/event-stream");

		handle.close();
	});

	it("reconnects after stream error then stops on close", async () => {
		let calls = 0;
		const pendingSleeps: Array<() => void> = [];
		const sleep = () =>
			new Promise<void>((resolve) => {
				pendingSleeps.push(resolve);
			});
		const flushOneSleep = () => {
			const next = pendingSleeps.shift();
			if (next) next();
		};

		const fetchImpl = vi.fn().mockImplementation(async () => {
			calls += 1;
			if (calls === 1) {
				throw new Error("network");
			}
			const encoder = new TextEncoder();
			return {
				ok: true,
				status: 200,
				body: new ReadableStream<Uint8Array>({
					start(controller) {
						controller.enqueue(
							encoder.encode('data: {"type":"connected","at":"t"}\n\n'),
						);
					},
				}),
			};
		});

		const opens: number[] = [];
		const errors: unknown[] = [];
		const handle = subscribeTenantNotificationStream(
			{
				accessToken: "tok",
				apiBase: "http://api.test",
				fetchImpl: fetchImpl as unknown as typeof fetch,
				retryBaseMs: 1,
				retryMaxMs: 5,
				sleep,
			},
			{
				onEvent: () => undefined,
				onOpen: () => opens.push(1),
				onError: (e) => errors.push(e),
			},
		);

		await vi.waitFor(() => {
			expect(errors.length).toBeGreaterThan(0);
		});
		// Allow one reconnect after the first failure.
		flushOneSleep();
		await vi.waitFor(() => {
			expect(opens.length).toBeGreaterThan(0);
		});
		expect(calls).toBeGreaterThanOrEqual(2);

		handle.close();
		const after = calls;
		flushOneSleep();
		await new Promise((r) => setTimeout(r, 30));
		expect(calls).toBe(after);
	});
});
