"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/app/context/WalletContext';

interface Idea {
    id: number;
    title: string;
    description: string; // Keep for potential tooltip or short display
    problem_statement?: string;
    solution?: string;
    target_audience?: string;
    impact?: string;
    required_resources?: string;
    submitter_wallet_address: string;
    submission_date: string; // ISO date string
    status: string;
    committee_feedback?: string;
    attachments?: { description?: string };
    patent_status?: string;
    technical_readiness_level?: number;
    contact_email?: string;
}

export default function ReviewIdeasPage() {
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const wallet = useWallet();

    useEffect(() => {
        const fetchIdeas = async () => {
            setIsLoading(true);
            setError(null);

            if (!wallet.state.isConnected || !wallet.state.address || !wallet.state.isVerified) {
                setError('Authentication required. Please ensure your wallet is connected and verified.');
                setIsLoading(false);
                console.log('ReviewIdeasPage: Wallet not connected/verified, aborting fetchIdeas.');
                return;
            }
            console.log(`ReviewIdeasPage: Wallet connected. Address: ${wallet.state.address}, Verified: ${wallet.state.isVerified}`);

            try {
                const response = await fetch('/api/ideas', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Address': wallet.state.address,
                    },
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Server error response:", errorData);
                    throw new Error(errorData.error || `Failed to fetch ideas. Status: ${response.status}`);
                }
                const data = await response.json();
                setIdeas(data.ideas || []);
            } catch (err) {
                console.error("Error fetching ideas in ReviewIdeasPage:", err);
                setError((err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };
        // Call fetchIdeas directly. The checks for wallet state are inside the function.
        // useEffect will re-run if the wallet state dependencies change.
        fetchIdeas(); 

    }, [wallet.state.isConnected, wallet.state.address, wallet.state.isVerified]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const shortenAddress = (address: string) => {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const statusBadgeBaseStyle = "px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full";

    const getStatusBadgeStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending review':
                return `${statusBadgeBaseStyle} bg-yellow-100 text-yellow-800`;
            case 'under review':
                return `${statusBadgeBaseStyle} bg-blue-100 text-blue-800`;
            case 'approved':
                return `${statusBadgeBaseStyle} bg-green-100 text-green-800`;
            case 'rejected':
                return `${statusBadgeBaseStyle} bg-red-100 text-red-800`;
            case 'needs more info':
                return `${statusBadgeBaseStyle} bg-purple-100 text-purple-800`;
            default:
                return `${statusBadgeBaseStyle} bg-gray-100 text-gray-800`;
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center text-white">
                <p>Loading submitted ideas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 text-center text-white">
                <h1 className="text-2xl font-bold mb-4 text-fieryRed">Error Fetching Ideas</h1>
                <div className="bg-seaBlue-900/50 border border-fieryRed p-4 rounded-md text-fieryRed">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <h1 className="text-3xl font-bold mb-8 text-center">Review Submitted Ideas</h1>

            {ideas.length === 0 ? (
                <div className="text-center p-6 bg-slate-800 rounded-lg shadow-xl">
                    <p className="text-slate-300">No ideas have been submitted yet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {ideas.map((idea) => (
                        <Link key={idea.id} href={`/review-ideas/${idea.id}`} legacyBehavior passHref>
                            <a className="group block bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 border-l-4 border-l-sky-500 hover:bg-slate-750 hover:border-sky-600 hover:border-l-sky-400 transition-all duration-200 ease-in-out">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-xl font-semibold text-sky-400 group-hover:text-sky-300 transition-colors duration-150 ease-in-out">{idea.title}</h2>
                                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-md font-mono">ID: {idea.id}</span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    <p>
                                        <span className="text-sm font-medium text-slate-500 mr-1.5">Submitter:</span>
                                        <span className="text-sm text-slate-300 font-mono">{shortenAddress(idea.submitter_wallet_address)}</span>
                                    </p>
                                    <p>
                                        <span className="text-sm font-medium text-slate-500 mr-1.5">Submitted:</span>
                                        <span className="text-sm text-slate-300">{formatDate(idea.submission_date)}</span>
                                    </p>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <span className={getStatusBadgeStyle(idea.status)}>
                                        {idea.status}
                                    </span>
                                </div>
                            </a>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
} 