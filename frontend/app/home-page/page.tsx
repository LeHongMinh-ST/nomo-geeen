import type { Metadata } from "next";
import { CtaSection } from "@/components/landing/cta-section";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MobileShowcase } from "@/components/landing/mobile-showcase";
import { OnboardingSupport } from "@/components/landing/onboarding-support";
import { Pricing } from "@/components/landing/pricing";
import { ScaleTiers } from "@/components/landing/scale-tiers";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export const metadata: Metadata = {
	title: "NomoGreen · Phần mềm bán hàng vật tư nông nghiệp",
	description:
		"Phần mềm bán hàng, quản lý kho và theo dõi công nợ cho nông hộ và cửa hàng vật tư nông nghiệp. To, rõ, dễ dùng ngay trên điện thoại.",
};

export default function LandingPage() {
	return (
		<div className="flex min-h-[100dvh] flex-col bg-background">
			<SiteHeader />
			<main className="flex-1">
				<Hero />
				<Features />
				<ScaleTiers />
				<MobileShowcase />
				<HowItWorks />
				<OnboardingSupport />
				<Pricing />
				<Faq />
				<CtaSection />
			</main>
			<SiteFooter />
		</div>
	);
}
