import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderDetail } from "../order-detail";
import { completeOrder, getOrder } from "@/lib/tenant-sales-api";
vi.mock("@/lib/tenant-sales-api", () => ({ getOrder: vi.fn(), completeOrder: vi.fn(), cancelOrder: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const draft = { id: "o1", docNo: "SO-D1", channel: "ORDER", status: "DRAFT", customer: null, warehouseId: "w", subtotal: 100, total: 100, discountAmount: 0, amountPaid: 0, changeAmount: 0, debtAmount: 0, paymentMethod: null, note: null, soldAt: null, completedAt: null, createdAt: "2026-07-22", updatedAt: "2026-07-22", lines: [{ id: "l", productId: "p", productName: "Phân bón", unitId: "u", unitName: "bao", qty: "1", qtyBase: "1", unitPrice: 100, lineTotal: 100 }] };
describe("OrderDetail lifecycle", () => { beforeEach(() => { vi.mocked(getOrder).mockResolvedValue(draft as any); vi.mocked(completeOrder).mockResolvedValue({ ...draft, status: "COMPLETED", amountPaid: 100, paymentMethod: "CASH" } as any); }); it("completes draft with canonical response and suppresses duplicate clicks", async () => { render(<OrderDetail id="o1" />); await screen.findByText("SO-D1"); const button = screen.getByRole("button", { name: "Hoàn thành đơn" }); fireEvent.click(button); fireEvent.click(button); await waitFor(() => expect(completeOrder).toHaveBeenCalledTimes(1)); expect(await screen.findByText("Hoàn thành")).toBeInTheDocument(); }); });
