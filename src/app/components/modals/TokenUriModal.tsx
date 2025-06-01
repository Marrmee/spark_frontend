import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import ModalUI from './ModalUI';
import Image from 'next/image';

interface TokenUriModalProps {
  transactionHash: string;
  handler: (value: boolean) => void;
  title: string;
  subtitle?: string;
  tokenUri: string;
  children?: React.ReactNode;
}

interface TokenMetadata {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
}

export default function TokenUriModal({
  transactionHash,
  handler,
  title,
  subtitle,
  tokenUri,
  children,
}: TokenUriModalProps) {
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);

  // Function to convert IPFS URI to HTTP gateway URL
  const ipfsToHttp = (uri: string): string => {
    if (!uri) return '';
    
    // Remove @ symbol if present at the beginning (sometimes used in URIs)
    if (uri.startsWith('@')) {
      uri = uri.substring(1);
    }
    
    // Handle ipfs:// protocol
    if (uri.startsWith('ipfs://')) {
      const cid = uri.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${cid}`;
    }
    
    // Handle Pinata gateway URLs
    if (uri.includes('mypinata.cloud/ipfs/')) {
      return uri;
    }
    
    // Handle other HTTP gateway URLs
    if (uri.includes('/ipfs/')) {
      return uri;
    }
    
    return uri;
  };

  // Fetch metadata from token URI
  useEffect(() => {
    const fetchTokenMetadata = async () => {
      if (!tokenUri) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Convert IPFS URI to HTTP if needed
        const httpUri = ipfsToHttp(tokenUri);
        
        // For Pinata URLs that are direct media files, we can skip the JSON parsing attempt
        if (httpUri.includes('mypinata.cloud/ipfs/bafybeic75anhtbuyfq6scsgcgpxtrlremls6x4s2uc5zbpoqcl5igpjdga')) {
          setMediaUrl(httpUri);
          setIsLoading(false);
          return;
        }
        
        // Fetch the metadata
        const response = await fetch(httpUri);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch token metadata: ${response.statusText}`);
        }
        
        // Check content type to determine if it's JSON or direct media
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // It's JSON metadata
          const data = await response.json();
          setMetadata(data);
          
          // Determine the media URL from metadata
          if (data.animation_url) {
            setMediaUrl(ipfsToHttp(data.animation_url));
          } else if (data.image) {
            setMediaUrl(ipfsToHttp(data.image));
          } else {
            // If the URI itself is a direct media file
            setMediaUrl(httpUri);
          }
        } else {
          // It's a direct media file
          setMediaUrl(httpUri);
        }
      } catch (err) {
        console.error('Error fetching token URI:', err);
        
        // Special case for the known Pinata URL
        if (tokenUri.includes('bafybeic75anhtbuyfq6scsgcgpxtrlremls6x4s2uc5zbpoqcl5igpjdga')) {
          const cleanUri = ipfsToHttp(tokenUri);
          setMediaUrl(cleanUri);
          setError(null);
        } else {
          setError('Failed to load token content');
          // Fallback to using the URI directly
          setMediaUrl(ipfsToHttp(tokenUri));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTokenMetadata();
  }, [tokenUri]);

  return (
    <ModalUI
      glowColorAndBorder="shadow-glow-tropicalBlue-intermediate max-h-[80vh] sm:max-h-[75vh] max-w-[95%] sm:max-w-[550px] md:max-w-[650px] overflow-auto"
      handler={handler}
    >
      <div className="relative w-full">
        <button
          onClick={() => handler(false)}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-darkBlue-800 text-xl text-gray-300 hover:bg-darkBlue-700 hover:text-white transition-colors"
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faTimes} size="sm" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-3 sm:p-5 text-center">
        <h2 className="mb-2 font-acuminSemiBold text-lg uppercase tracking-wider sm:text-xl">
          {title}
        </h2>

        {subtitle && (
          <p className="mb-3 text-xs text-gray-300 sm:text-sm">
            {subtitle}
          </p>
        )}

        <div className="w-full space-y-3 sm:space-y-4">
          <div className="text-center">
            <a
              href={transactionHash}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm items-center text-steelBlue hover:text-tropicalBlue transition-colors duration-200"
              aria-label="View transaction on explorer"
            >
              View Transaction <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1" size="xs" />
            </a>
          </div>

          <div className="text-center">
            <div className="mx-auto overflow-hidden rounded-md border border-blue-500 w-full">
              {isLoading ? (
                <div className="bg-darkBlue-1000 flex aspect-video w-full items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading token content...</div>
                </div>
              ) : error ? (
                <div className="bg-darkBlue-1000 flex aspect-video w-full items-center justify-center">
                  <p className="text-red-400">{error}</p>
                </div>
              ) : mediaUrl ? (
                <div className="aspect-video w-full relative group">
                  {/* Special case for the known Pinata URL */}
                  {mediaUrl.includes('bafybeic75anhtbuyfq6scsgcgpxtrlremls6x4s2uc5zbpoqcl5igpjdga') || 
                   mediaUrl.toLowerCase().endsWith('.mp4') || 
                   mediaUrl.toLowerCase().includes('video') || 
                   (metadata?.animation_url && !mediaUrl.toLowerCase().endsWith('.png')) ? (
                    <video
                      className="h-full w-full"
                      controls
                      src={mediaUrl}
                      poster="/images/video-placeholder.png"
                      autoPlay={true}
                      loop={true}
                      muted={true}
                      playsInline={true}
                      controlsList="nodownload"
                      style={{ 
                        objectFit: 'contain',
                        backgroundColor: 'black'
                      }}
                      onMouseOver={(e) => {
                        const video = e.currentTarget;
                        video.controls = true;
                      }}
                      onMouseOut={(e) => {
                        const video = e.currentTarget;
                        video.controls = false;
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    // @next/next/no-img-element
                    <Image
                      src={mediaUrl} 
                      alt={metadata?.name || "Token Media"} 
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="bg-darkBlue-1000 flex aspect-video w-full items-center justify-center">
                  <p className="text-gray-400">
                    Token URI will be displayed here
                  </p>
                </div>
              )}
            </div>
            
            {metadata?.name && (
              <p className="mt-2 text-xs font-medium text-white sm:text-sm">
                {metadata.name}
              </p>
            )}
            
            {metadata?.description && (
              <p className="mt-1 text-xs text-gray-300 max-w-md mx-auto">
                {metadata.description}
              </p>
            )}
          </div>

          {children && <div className="mt-2 text-center text-sm">{children}</div>}

          <div className="mt-3 sm:mt-4 text-center">
            <a
              className="text-steelBlue hover:text-tropicalBlue transition-colors duration-200 text-sm"
              href="/po-exchange"
            >
              Convert your PO tokens here
            </a>
          </div>
        </div>
      </div>
    </ModalUI>
  );
}
