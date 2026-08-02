import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallButton } from "./pwa-install-button";

const MOBILE = "(max-width: 1023px)";
const STANDALONE = "(display-mode: standalone)";

let originalUserAgent: string;

function setMatchMedia(matches: Record<string, boolean>) {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: (query: string) => ({
			matches: matches[query] ?? false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}),
	});
}

function setUserAgent(ua: string) {
	Object.defineProperty(navigator, "userAgent", {
		configurable: true,
		get: () => ua,
	});
}

function setNavigatorStandalone(value: boolean) {
	Object.defineProperty(navigator, "standalone", {
		configurable: true,
		value,
	});
}

function dispatchInstallPrompt(
	outcome: "accepted" | "dismissed" = "accepted",
) {
	const prompt = vi.fn().mockResolvedValue(undefined);
	const event = new Event("beforeinstallprompt", { cancelable: true });
	Object.assign(event, {
		prompt,
		userChoice: Promise.resolve({ outcome }),
	});
	act(() => window.dispatchEvent(event));
	return { prompt, event };
}

describe("PwaInstallButton", () => {
	beforeEach(() => {
		originalUserAgent = navigator.userAgent;
		// Desktop Chromium mặc định: không mobile, không iOS.
		setUserAgent(
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
		);
		setNavigatorStandalone(false);
	});

	afterEach(() => {
		setUserAgent(originalUserAgent);
	});

	it("ẩn trên desktop", () => {
		setMatchMedia({});
		render(<PwaInstallButton />);
		expect(
			screen.queryByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		).not.toBeInTheDocument();
	});

	it("hiện trên viewport mobile dù DevTools giữ pointer fine", () => {
		setMatchMedia({ [MOBILE]: true });
		render(<PwaInstallButton />);
		expect(
			screen.getByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		).toBeInTheDocument();
	});

	it("mobile không có native prompt vẫn mở hướng dẫn fallback", () => {
		setMatchMedia({ [MOBILE]: true });
		render(<PwaInstallButton />);
		fireEvent.click(
			screen.getByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		);
		expect(
			screen.getByText("Mở nhanh như một ứng dụng trên điện thoại"),
		).toBeInTheDocument();
	});

	it("ẩn khi chạy standalone qua display-mode", () => {
		setMatchMedia({ [MOBILE]: true, [STANDALONE]: true });
		render(<PwaInstallButton />);
		expect(
			screen.queryByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		).not.toBeInTheDocument();
	});

	it("ẩn khi chạy standalone trên iOS qua navigator.standalone", () => {
		setMatchMedia({ [MOBILE]: true });
		setNavigatorStandalone(true);
		render(<PwaInstallButton />);
		expect(
			screen.queryByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		).not.toBeInTheDocument();
	});

	it("hiện CTA khi có beforeinstallprompt (Android/Chromium)", () => {
		setMatchMedia({ [MOBILE]: true });
		render(<PwaInstallButton />);
		dispatchInstallPrompt();
		expect(
			screen.getByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		).toBeInTheDocument();
	});

	it("click gọi prompt() và ẩn sau khi chấp nhận", async () => {
		setMatchMedia({ [MOBILE]: true });
		render(<PwaInstallButton />);
		const { prompt } = dispatchInstallPrompt();

		fireEvent.click(
			screen.getByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		);
		await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Cài ứng dụng NomoGreen" }),
			).not.toBeInTheDocument(),
		);
	});

	it("ẩn sau khi người dùng từ chối prompt", async () => {
		setMatchMedia({ [MOBILE]: true });
		render(<PwaInstallButton />);
		dispatchInstallPrompt("dismissed");

		fireEvent.click(
			screen.getByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		);
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Cài ứng dụng NomoGreen" }),
			).not.toBeInTheDocument(),
		);
	});

	it("appinstalled làm CTA biến mất không cần refresh", async () => {
		setMatchMedia({ [MOBILE]: true });
		render(<PwaInstallButton />);
		dispatchInstallPrompt();
		expect(
			screen.getByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		).toBeInTheDocument();

		act(() => window.dispatchEvent(new Event("appinstalled")));
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Cài ứng dụng NomoGreen" }),
			).not.toBeInTheDocument(),
		);
	});

	it("iOS Safari: CTA hiện trước, hướng dẫn chưa hiện đến khi bấm CTA", () => {
		setMatchMedia({ [MOBILE]: true });
		setUserAgent(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		);
		render(<PwaInstallButton />);

		const cta = screen.getByRole("button", {
			name: "Cài ứng dụng NomoGreen",
		});
		expect(cta).toBeInTheDocument();
		// Hướng dẫn chưa mở trước khi bấm.
		expect(
			screen.queryByText(/Thêm vào màn hình chính/),
		).not.toBeInTheDocument();

		fireEvent.click(cta);

		// Sau click: sheet hướng dẫn hiện, không gọi prompt native.
		expect(screen.getByText(/Thêm vào màn hình chính/)).toBeInTheDocument();
		expect(screen.getByRole("dialog")).toHaveAttribute(
			"aria-label",
			"Hướng dẫn cài ứng dụng NomoGreen",
		);
	});

	it("iOS Safari: đóng hướng dẫn sẽ ẩn CTA trong phiên", () => {
		setMatchMedia({ [MOBILE]: true });
		setUserAgent(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		);
		render(<PwaInstallButton />);

		fireEvent.click(
			screen.getByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		);
		expect(screen.getByText(/Thêm vào màn hình chính/)).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "Đóng hướng dẫn cài ứng dụng" }),
		);
		expect(
			screen.queryByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		).not.toBeInTheDocument();
	});

	it("iOS Safari không có CTA khi standalone", () => {
		setMatchMedia({ [MOBILE]: true, [STANDALONE]: true });
		setUserAgent(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		);
		render(<PwaInstallButton />);
		expect(
			screen.queryByRole("button", { name: "Cài ứng dụng NomoGreen" }),
		).not.toBeInTheDocument();
	});
});
