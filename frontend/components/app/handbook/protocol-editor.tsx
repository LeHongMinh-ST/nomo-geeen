"use client";

import { Plus, Trash2 } from "lucide-react";
import {
	AREA_UNIT_OPTIONS,
	type AreaUnitId,
	type ProtocolInput,
	type ProtocolItemInput,
} from "@/lib/tenant-handbook-api";

function emptyItem(): ProtocolItemInput {
	return {
		activeIngredient: "",
		doseAmount: 0,
		doseUnit: "ml",
		perAreaAmount: 1000,
		perAreaUnit: "M2",
		mixing: "",
		usage: "",
	};
}

export function emptyProtocol(index: number): ProtocolInput {
	return {
		name: index === 0 ? "Bộ thuốc chính" : `Bộ thuốc thay thế ${index}`,
		note: "",
		isDefault: index === 0,
		items: [emptyItem()],
	};
}

const inputClass =
	"h-11 w-full rounded-lg border border-border bg-white px-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function ProtocolEditor({
	protocols,
	onChange,
	products,
}: {
	protocols: ProtocolInput[];
	onChange: (protocols: ProtocolInput[]) => void;
	products: Array<{ id: string; name: string }>;
}) {
	function patchProtocol(index: number, patch: Partial<ProtocolInput>) {
		onChange(
			protocols.map((protocol, i) =>
				i === index ? { ...protocol, ...patch } : protocol,
			),
		);
	}

	function patchItem(
		pIndex: number,
		iIndex: number,
		patch: Partial<ProtocolItemInput>,
	) {
		patchProtocol(pIndex, {
			items: protocols[pIndex].items.map((item, i) =>
				i === iIndex ? { ...item, ...patch } : item,
			),
		});
	}

	return (
		<div className="flex flex-col gap-4">
			{protocols.map((protocol, pIndex) => (
				<article
					// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and reorder as a unit
					key={pIndex}
					className="flex flex-col gap-3 rounded-[12px] border border-border bg-[#fafafa] p-4"
				>
					<div className="flex items-start gap-2">
						<div className="min-w-0 flex-1">
							<label
								htmlFor={`protocol-name-${pIndex}`}
								className="text-sm font-medium"
							>
								Tên bộ thuốc
							</label>
							<input
								id={`protocol-name-${pIndex}`}
								value={protocol.name}
								onChange={(event) =>
									patchProtocol(pIndex, { name: event.target.value })
								}
								className={`mt-1 ${inputClass}`}
							/>
						</div>
						<button
							type="button"
							onClick={() =>
								onChange(protocols.filter((_, i) => i !== pIndex))
							}
							aria-label={`Xoá bộ thuốc ${pIndex + 1}`}
							className="mt-7 flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-[#c62828]"
						>
							<Trash2 className="size-4" aria-hidden />
						</button>
					</div>

					<label className="flex items-center gap-2 text-sm font-medium">
						<input
							type="radio"
							name="default-protocol"
							checked={!!protocol.isDefault}
							onChange={() =>
								onChange(
									protocols.map((p, i) => ({ ...p, isDefault: i === pIndex })),
								)
							}
							className="size-4 accent-[#2e7d32]"
						/>
						Dùng làm bộ thuốc mặc định
					</label>

					<div className="flex flex-col gap-3">
						{protocol.items.map((item, iIndex) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
								key={iIndex}
								className="flex flex-col gap-2 rounded-[10px] border border-border bg-white p-3"
							>
								<div className="flex items-start gap-2">
									<div className="min-w-0 flex-1">
										<label
											htmlFor={`item-product-${pIndex}-${iIndex}`}
											className="text-sm font-medium"
										>
											Sản phẩm
										</label>
										<select
											id={`item-product-${pIndex}-${iIndex}`}
											value={item.productId ?? ""}
											onChange={(event) =>
												patchItem(pIndex, iIndex, {
													productId: event.target.value || undefined,
												})
											}
											className={`mt-1 ${inputClass}`}
										>
											<option value="">— Chỉ ghi hoạt chất —</option>
											{products.map((product) => (
												<option key={product.id} value={product.id}>
													{product.name}
												</option>
											))}
										</select>
									</div>
									<button
										type="button"
										onClick={() =>
											patchProtocol(pIndex, {
												items: protocol.items.filter((_, i) => i !== iIndex),
											})
										}
										aria-label={`Xoá thuốc ${iIndex + 1}`}
										className="mt-7 flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-[#c62828]"
									>
										<Trash2 className="size-4" aria-hidden />
									</button>
								</div>

								<div>
									<label
										htmlFor={`item-ingredient-${pIndex}-${iIndex}`}
										className="text-sm font-medium"
									>
										Hoạt chất {item.productId ? "(tuỳ chọn)" : "(bắt buộc)"}
									</label>
									<input
										id={`item-ingredient-${pIndex}-${iIndex}`}
										value={item.activeIngredient ?? ""}
										onChange={(event) =>
											patchItem(pIndex, iIndex, {
												activeIngredient: event.target.value,
											})
										}
										placeholder="Ví dụ: Tricyclazole 75%"
										className={`mt-1 ${inputClass}`}
									/>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div>
										<label
											htmlFor={`item-dose-${pIndex}-${iIndex}`}
											className="text-sm font-medium"
										>
											Liều
										</label>
										<input
											id={`item-dose-${pIndex}-${iIndex}`}
											inputMode="decimal"
											value={item.doseAmount || ""}
											onChange={(event) =>
												patchItem(pIndex, iIndex, {
													doseAmount: Number(event.target.value) || 0,
												})
											}
											className={`mt-1 ${inputClass}`}
										/>
									</div>
									<div>
										<label
											htmlFor={`item-dose-unit-${pIndex}-${iIndex}`}
											className="text-sm font-medium"
										>
											Đơn vị liều
										</label>
										<input
											id={`item-dose-unit-${pIndex}-${iIndex}`}
											value={item.doseUnit}
											onChange={(event) =>
												patchItem(pIndex, iIndex, {
													doseUnit: event.target.value,
												})
											}
											placeholder="ml / g"
											className={`mt-1 ${inputClass}`}
										/>
									</div>
									<div>
										<label
											htmlFor={`item-area-${pIndex}-${iIndex}`}
											className="text-sm font-medium"
										>
											Trên mỗi
										</label>
										<input
											id={`item-area-${pIndex}-${iIndex}`}
											inputMode="decimal"
											value={item.perAreaAmount || ""}
											onChange={(event) =>
												patchItem(pIndex, iIndex, {
													perAreaAmount: Number(event.target.value) || 0,
												})
											}
											className={`mt-1 ${inputClass}`}
										/>
									</div>
									<div>
										<label
											htmlFor={`item-area-unit-${pIndex}-${iIndex}`}
											className="text-sm font-medium"
										>
											Đơn vị diện tích
										</label>
										<select
											id={`item-area-unit-${pIndex}-${iIndex}`}
											value={item.perAreaUnit}
											onChange={(event) =>
												patchItem(pIndex, iIndex, {
													perAreaUnit: event.target.value as AreaUnitId,
												})
											}
											className={`mt-1 ${inputClass}`}
										>
											{AREA_UNIT_OPTIONS.map((option) => (
												<option key={option.id} value={option.id}>
													{option.label}
												</option>
											))}
										</select>
									</div>
								</div>

								<div>
									<label
										htmlFor={`item-mixing-${pIndex}-${iIndex}`}
										className="text-sm font-medium"
									>
										Cách pha
									</label>
									<textarea
										id={`item-mixing-${pIndex}-${iIndex}`}
										value={item.mixing ?? ""}
										onChange={(event) =>
											patchItem(pIndex, iIndex, { mixing: event.target.value })
										}
										rows={2}
										placeholder="Ví dụ: Pha 25ml với 20 lít nước"
										className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
									/>
								</div>
								<div>
									<label
										htmlFor={`item-usage-${pIndex}-${iIndex}`}
										className="text-sm font-medium"
									>
										Cách dùng
									</label>
									<textarea
										id={`item-usage-${pIndex}-${iIndex}`}
										value={item.usage ?? ""}
										onChange={(event) =>
											patchItem(pIndex, iIndex, { usage: event.target.value })
										}
										rows={2}
										placeholder="Ví dụ: Phun đều mặt lá vào sáng sớm"
										className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
									/>
								</div>
							</div>
						))}

						<button
							type="button"
							onClick={() =>
								patchProtocol(pIndex, { items: [...protocol.items, emptyItem()] })
							}
							className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-dashed border-primary text-sm font-semibold text-primary"
						>
							<Plus className="size-4" aria-hidden />
							Thêm thuốc
						</button>
					</div>
				</article>
			))}

			<button
				type="button"
				onClick={() => onChange([...protocols, emptyProtocol(protocols.length)])}
				className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-dashed border-border text-sm font-semibold text-[#616161]"
			>
				<Plus className="size-4" aria-hidden />
				Thêm bộ thuốc thay thế
			</button>
		</div>
	);
}
