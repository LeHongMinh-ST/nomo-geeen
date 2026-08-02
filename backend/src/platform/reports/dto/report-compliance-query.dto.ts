import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/** Sổ xuất nhập theo lô — lọc theo khoảng ngày, tùy chọn một sản phẩm. */
export class ReportBatchLedgerQueryDto {
	@IsOptional()
	@IsISO8601()
	from?: string;

	@IsOptional()
	@IsISO8601()
	to?: string;

	@IsOptional()
	@IsUUID('4')
	productId?: string;
}

/** Truy xuất theo số đăng ký lưu thông. */
export class ReportRegistrationTraceQueryDto {
	@IsString()
	@IsNotEmpty()
	registrationNo!: string;

	@IsOptional()
	@IsISO8601()
	from?: string;

	@IsOptional()
	@IsISO8601()
	to?: string;
}
