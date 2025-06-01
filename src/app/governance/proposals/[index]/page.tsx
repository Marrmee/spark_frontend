import { Metadata } from 'next';
import { use } from 'react';
import ClientResearchProposalPage from './ClientResearchProposalPage';

export const metadata: Metadata = {
  title: 'Research Proposal Details | PoSciDonDAO',
  description: 'View and interact with research proposals',
};

export default function Page({ params }) {
  // Unwrap params using React.use()
  const unwrappedParams = use(Promise.resolve(params));
  return <ClientResearchProposalPage params={unwrappedParams} />;
}