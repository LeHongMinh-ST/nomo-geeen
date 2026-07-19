import type * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex h-12 w-full rounded-[10px] border border-border bg-white px-3.5 text-base text-foreground shadow-xs outline-none transition-colors duration-200 ease-out placeholder:text-[#9e9e9e] focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:h-11",
				"aria-invalid:border-destructive aria-invalid:ring-destructive/25",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
