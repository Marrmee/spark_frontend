import { Metadata, Viewport } from "next";
import TermsOfService from "@/app/components/general/TermsOfService"; // Adjust the import path as necessary

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1.0,
};

export const metadata: Metadata = {
	title: "Terms of Service - PoSciDonDAO Foundation",
	description:
		"Read the terms of service for PoSciDonDAO Foundation. By using our service, you agree to these terms and conditions.",
	keywords: ["Terms of Service", "Legal", "PoSciDonDAO Foundation"],
	robots: "index, follow",
};

const TermsPage: React.FC = () => {
	return (
		<div>
			<TermsOfService />
		</div>
	);
};

export default TermsPage;
