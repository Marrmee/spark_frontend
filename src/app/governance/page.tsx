import { Proposals } from '@/app/components/governance/Proposals';
import Propose from '@/app/components/governance/Propose';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Tabs from '@/app/components/general/Tabs';
import Tab from '@/app/components/general/Tab';
import { Metadata, Viewport } from 'next';
import SparkParameters from '../components/general/SparkParameters';

const url = new URL('https://protocol.poscidondao.com/governance/research');

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  metadataBase: url,
  title: 'PoSciDonDAO | Spark Research Funding Governance',
  description: `Proposals for funding personalized medicine research can be created, voted on and executed by Due Diligence Crew members`,
  alternates: {
    canonical: url,
  },
  robots: 'index, follow',
};

export default function ResearchFunding() {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tabs = [
    <Tab
      key="view"
      title="View proposals"
      size="text-sm md:text-lg 2xl:text-xl sm:my-4"
    >
      <Proposals />
    </Tab>,
    <Tab
      key="create"
      title="Create proposal"
      size="text-sm md:text-lg 2xl:text-xl sm:my-4"
    >
      <Propose />
    </Tab>,
    <Tab key="parameters" title="View parameters" size="text-sm md:text-lg 2xl:text-xl sm:my-4">
      <SparkParameters />
    </Tab>,
  ];

  return (
    <div className="min-h-screen bg-seaBlue-1100 text-white">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="mb-4 text-center text-2xl font-bold">
          Research Funding Governance
        </h1>
        <div className="container mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Proposals />
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Propose />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
