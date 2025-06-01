"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';

// Re-using the Idea interface from the list page, ensure all fields are covered
interface Idea {
    id: number;
    title: string;
    description: string;
    problem_statement?: string;
    solution?: string;
    target_audience?: string;
    impact?: string;
    required_resources?: string;
    submitter_wallet_address: string;
    submission_date: string; 
    status: string;
    committee_feedback?: string;
    attachments?: { description?: string }; // Matching submit page structure
    patent_status?: string;
    technical_readiness_level?: number;
    contact_email?: string;
}

// For formatting dates and addresses (can be moved to a utils file later)
const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });
};

// const shortenAddress = (address: string) => {
//     if (!address) return 'N/A';
//     return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
// };

const statusOptions = [
    'Pending Review',
    'Under Review',
    'Needs More Info',
    'Approved',
    'Rejected'
];

export default function IdeaDetailPage() {
    const params = useParams();
    const id = params?.id as string; // Will be string from params

    const { state, signMessage, generateSignInMessage } = useWallet();
    const networkInfo = useNetworkInfo();

    const [idea, setIdea] = useState<Idea | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // For future update functionality
    const [currentStatus, setCurrentStatus] = useState('');
    const [feedbackText, setFeedbackText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

    useEffect(() => {
        // If wallet is not connected (no address), set auth error and stop.
        if (!state.address) {
            setError('Authentication required. Please ensure your wallet is connected and verified.');
            setIsLoading(false);
            return; // Don't proceed to fetch
        }

        // If we have an address and an ID, then fetch.
        if (id) { 
            const fetchIdeaDetails = async () => {
                setIsLoading(true); // Set loading true for this specific fetch attempt
                setError(null); // Clear any previous errors (like the auth error if user just logged in)
                try {
                    const response = await fetch(`/api/ideas/${id}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-Address': state.address!,
                        },
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Failed to fetch idea ${id}`);
                    }
                    const data = await response.json();
                    setIdea(data.idea);
                    // Initialize update form fields
                    if (data.idea) {
                        setCurrentStatus(data.idea.status || '');
                        setFeedbackText(data.idea.committee_feedback || '');
                    }
                } catch (err) {
                    console.error("Error fetching idea details:", err);
                    setError((err as Error).message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchIdeaDetails();
        } else {
            // Handle case where id is missing (e.g., route somehow accessed without ID)
            setError("Idea ID is missing in the URL.");
            setIsLoading(false);
        }
    }, [id, state.address]);

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !idea) {
            setUpdateError("Idea details not loaded yet.");
            return;
        }

        if (!state.isConnected || !state.address) {
            setUpdateError("Please connect your wallet to update an idea.");
            return;
        }
        if (!state.isVerified) {
            setUpdateError("Please ensure your wallet is verified before updating.");
            return;
        }
        const currentChainId = state.chainId ? parseInt(state.chainId, 16) : networkInfo?.chainId;
        if (!currentChainId) {
            setUpdateError("Could not determine chain ID for signing. Please reconnect your wallet or refresh.");
            return;
        }

        setIsUpdating(true);
        setUpdateError(null);
        setUpdateSuccess(null);

        let signature: string | null = null;
        try {
            const siweMessage = generateSignInMessage(state.address, currentChainId);
            if (!siweMessage) {
                throw new Error("Failed to generate sign-in message.");
            }
            signature = await signMessage(siweMessage);

            if (!signature) {
                throw new Error("Failed to sign message. Update cancelled. The signature request might have been rejected or timed out.");
            }
        } catch (signError: unknown) {
            console.error("Error signing message:", signError);
            const errorMessage = signError instanceof Error ? signError.message : "An unknown error occurred during signing.";
            setUpdateError(`Failed to sign message: ${errorMessage}`);
            setIsUpdating(false);
            return;
        }

        try {
            const response = await fetch(`/api/ideas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-eth-address': state.address,
                    'x-eth-signature': signature,
                },
                body: JSON.stringify({
                    status: currentStatus,
                    committee_feedback: feedbackText,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to update idea ${id}`);
            }

            setUpdateSuccess("Idea updated successfully!");
            if (result.idea) {
                setIdea(result.idea);
                setCurrentStatus(result.idea.status || '');
                setFeedbackText(result.idea.committee_feedback || '');
            }
        } catch (err) {
            console.error("Error updating idea:", err);
            setUpdateError((err as Error).message);
        } finally {
            setIsUpdating(false);
        }
    };

    // Styling constants (can be centralized)
    const sectionStyle = "bg-slate-800 p-6 rounded-lg shadow-xl mb-6";
    const headingStyle = "text-2xl font-semibold text-sky-400 mb-4";
    const labelStyle = "block text-sm font-medium text-slate-400 mb-1";
    const valueStyle = "text-slate-100 text-base";
    const inputStyle = "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none text-white";
    const buttonStyle = "px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out disabled:opacity-50";

    if (isLoading) {
        return <div className="container mx-auto px-4 py-8 text-center text-white"><p>Loading idea details...</p></div>;
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 text-center text-red-400">
                <h1 className="text-2xl font-bold mb-4">Error Fetching Idea</h1>
                <p className="bg-red-900 p-4 rounded-md">{error}</p>
                <Link href="/review-ideas" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
                    &larr; Back to Ideas List
                </Link>
            </div>
        );
    }

    if (!idea) {
        return (
            <div className="container mx-auto px-4 py-8 text-center text-white">
                <p>Idea not found.</p>
                <Link href="/review-ideas" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
                    &larr; Back to Ideas List
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <div className="mb-6">
                <Link href="/review-ideas" className="text-sky-400 hover:text-sky-300">
                    &larr; Back to Ideas List
                </Link>
            </div>

            <h1 className="text-4xl font-bold mb-8 text-center break-words">{idea.title}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`md:col-span-2 ${sectionStyle}`}>
                    <h2 className={headingStyle}>Idea Details</h2>
                    
                    <div className="space-y-4">
                        <div><p className={labelStyle}>ID:</p><p className={valueStyle}>{idea.id}</p></div>
                        <div><p className={labelStyle}>Full Description:</p><p className={`${valueStyle} whitespace-pre-wrap`}>{idea.description}</p></div>
                        {idea.problem_statement && <div><p className={labelStyle}>Problem Statement:</p><p className={`${valueStyle} whitespace-pre-wrap`}>{idea.problem_statement}</p></div>}
                        {idea.solution && <div><p className={labelStyle}>Proposed Solution:</p><p className={`${valueStyle} whitespace-pre-wrap`}>{idea.solution}</p></div>}
                        {idea.target_audience && <div><p className={labelStyle}>Target Audience/Field:</p><p className={valueStyle}>{idea.target_audience}</p></div>}
                        {idea.impact && <div><p className={labelStyle}>Potential Impact/Advantages:</p><p className={`${valueStyle} whitespace-pre-wrap`}>{idea.impact}</p></div>}
                        {idea.required_resources && <div><p className={labelStyle}>Required Resources:</p><p className={`${valueStyle} whitespace-pre-wrap`}>{idea.required_resources}</p></div>}
                        {idea.attachments?.description && <div><p className={labelStyle}>Attachments Description:</p><p className={`${valueStyle} whitespace-pre-wrap`}>{idea.attachments.description}</p></div>}
                    </div>
                </div>

                <div className={`md:col-span-1 space-y-6`}>
                    <div className={sectionStyle}>
                        <h2 className={headingStyle}>Submission Info</h2>
                        <div><p className={labelStyle}>Submitter Wallet:</p><p className={`${valueStyle} break-all`}>{idea.submitter_wallet_address} (<Link href={`https://etherscan.io/address/${idea.submitter_wallet_address}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">View on Etherscan</Link>)</p></div>
                        <div><p className={labelStyle}>Submission Date:</p><p className={valueStyle}>{formatDate(idea.submission_date)}</p></div>
                        {idea.contact_email && <div><p className={labelStyle}>Contact Email:</p><p className={valueStyle}>{idea.contact_email}</p></div>}
                        <div><p className={labelStyle}>Patent Status:</p><p className={valueStyle}>{idea.patent_status || 'N/A'}</p></div>
                        <div><p className={labelStyle}>Technical Readiness Level (TRL):</p><p className={valueStyle}>{idea.technical_readiness_level ? `TRL ${idea.technical_readiness_level}` : 'N/A'}</p></div>
                    </div>

                    <div className={sectionStyle}>
                        <h2 className={headingStyle}>Review Status & Feedback</h2>
                        <div><p className={labelStyle}>Current Status:</p><p className={`${valueStyle} font-semibold`}>{idea.status}</p></div>
                        <div>
                            <p className={labelStyle}>Committee Feedback:</p>
                            <p className={`${valueStyle} whitespace-pre-wrap`}>{idea.committee_feedback || "No feedback provided yet."}</p>
                        </div>
                        
                        <form onSubmit={handleUpdateSubmit} className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="statusUpdate" className={`${labelStyle} mb-1`}>Update Status:</label>
                                <select 
                                    id="statusUpdate" 
                                    name="statusUpdate"
                                    value={currentStatus}
                                    onChange={(e) => setCurrentStatus(e.target.value)}
                                    className={inputStyle}
                                >
                                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="feedbackText" className={`${labelStyle} mb-1`}>Add/Edit Feedback:</label>
                                <textarea 
                                    id="feedbackText" 
                                    name="feedbackText"
                                    rows={4} 
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    className={inputStyle}
                                    placeholder="Provide feedback for the submitter..."
                                />
                            </div>
                            {updateError && <p className="text-sm text-red-400">{updateError}</p>}
                            {updateSuccess && <p className="text-sm text-green-400">{updateSuccess}</p>}
                            <button type="submit" className={buttonStyle} disabled={isUpdating || !state.isVerified}>
                                {isUpdating ? 'Updating...' : 'Submit Review Update'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
} 