"use client";
import { Package } from "lucide-react";
import Link from "next/link";
import { formatDate, formatVND } from "@/lib/format";
import type { SalesOrderSummary } from "@/lib/tenant-sales-api";
export const statusLabel = { DRAFT:"Nháp", COMPLETED:"Hoàn thành", CANCELLED:"Đã hủy" } as const;
export const paymentLabel = { CASH:"Tiền mặt", BANK_TRANSFER:"Chuyển khoản", QR:"QR", DEBT:"Ghi nợ" } as const;
export const statusClass = { DRAFT:"bg-[#fff8e1] text-[#8a6500]", COMPLETED:"bg-[#edf7e9] text-[#3f8530]", CANCELLED:"bg-[#fdecea] text-[#b3261e]" } as const;
export function OrderCard({order}:{order:SalesOrderSummary}) { return <Link href={`/don-ban-hang/${order.id}`} className="flex min-h-28 items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card hover:shadow-[0_8px_30px_rgba(0,0,0,.08)]"><span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#5cad45]"><Package className="size-6 text-white" aria-hidden /></span><div className="flex min-w-0 flex-1 flex-col gap-1"><div className="flex items-start justify-between gap-2"><p className="text-base font-semibold">{order.docNo}</p><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass[order.status]}`}>{statusLabel[order.status]}</span></div><p className="truncate text-sm text-[#616161]">{order.customerName || "Khách lẻ"} · {order.itemCount} món · {order.paymentMethod ? paymentLabel[order.paymentMethod] : "Chưa thanh toán"}</p><div className="mt-1 flex items-end justify-between gap-2"><span className="text-sm text-[#9e9e9e]">{formatDate(order.soldAt || order.createdAt)}</span><span className="text-lg font-bold">{formatVND(order.total)}₫</span></div></div></Link>; }
