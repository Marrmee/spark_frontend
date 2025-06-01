'use client';

import { useState, type FormEvent, type ChangeEvent, useEffect, useRef } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import InfoToolTip from '@/app/components/general/InfoToolTip';
import SuccessModal from '@/app/components/modals/ModalSubmission';

interface IdeaFormData {
  fullname: string;
  title: string;
  description: string;
  problem_statement: string;
  solution: string;
  target_audience: string;
  impact: string;
  required_resources: string;
  attachments_description: string;
  attachmentFiles?: File[] | null;
  patent_status: string;
  technical_readiness_level: string;
  contact_email: string;
}

const initialFormData: IdeaFormData = {
  fullname: '',
  title: '',
  description: '',
  problem_statement: '',
  solution: '',
  target_audience: '',
  impact: '',
  required_resources: '',
  attachments_description: '',
  attachmentFiles: [],
  patent_status: 'Not Filed',
  technical_readiness_level: '1', // TRLs are 1-9
  contact_email: '',
};

const patentStatusOptions = [
  'Not Filed',
  'Prior Art Search Done',
  'Provisional Filed',
  'Drafting Full Patent',
  'Full Patent Filed',
  'Patented',
  'Other',
];

const trlOptions = Array.from({ length: 9 }, (_, i) => (i + 1).toString());

type FormField = {
  name: keyof IdeaFormData;
  label: string | React.ReactNode;
  type: 'text' | 'textarea' | 'select' | 'email' | 'file';
  placeholder?: string;
  options?: string[];
  rows?: number;
  required: boolean;
};

const formSteps: FormField[][] = [
  // Step 1: Core Idea Definition
  [
    {
      name: 'title',
      label: 'Idea Title / Name of Invention',
      type: 'text',
      placeholder: 'e.g., Quantum Entanglement Communicator',
      required: true,
    },
    {
      name: 'description',
      label: 'Detailed Description of the Idea/Invention',
      type: 'textarea',
      rows: 6,
      placeholder:
        'Provide a comprehensive description of your idea, its purpose, and how it works...',
      required: true,
    },
    {
      name: 'problem_statement',
      label: 'Problem Statement',
      type: 'textarea',
      rows: 3,
      placeholder: 'What specific problem does your idea solve?',
      required: true,
    },
    {
      name: 'solution',
      label: 'Proposed Solution',
      type: 'textarea',
      rows: 4,
      placeholder:
        'Describe how your idea solves the stated problem. What are the key mechanisms or components?',
      required: true,
    },
  ],
  // Step 2: Context and Impact
  [
    {
      name: 'target_audience',
      label: 'Target Audience / Field of Invention',
      type: 'text',
      placeholder:
        'e.g., Space Exploration, Medical Diagnostics, Sustainable Energy',
      required: true,
    },
    {
      name: 'impact',
      label: 'Potential Impact / Advantages',
      type: 'textarea',
      rows: 3,
      placeholder:
        'What are the potential benefits, advantages over existing solutions, or broader impact?',
      required: true,
    },
    {
      name: 'required_resources',
      label: 'Required Resources',
      type: 'textarea',
      rows: 2,
      placeholder:
        'What key resources (e.g., funding, expertise, equipment) might be needed?',
      required: false,
    },
    {
      name: 'attachments_description',
      label: 'Description of Attachments',
      type: 'textarea',
      rows: 2,
      placeholder:
        "List or describe any supporting documents, diagrams, or references (e.g., 'technical_drawing.pdf', 'prior_art_analysis.docx')",
      required: false,
    },
    {
      name: 'attachmentFiles',
      label: 'Upload Attachments (Optional, Max 5MB per file)',
      type: 'file',
      required: false,
    },
  ],
  // Step 3: Status and Contact
  [
    {
      name: 'patent_status',
      label: (
        <span className="flex items-center">
          Current Patent Status <span className="ml-1 text-orange-500">*</span>
          <span className="ml-2">
            <InfoToolTip position="right" width={300}>
              <div className="text-left">
                <p className="font-semibold mb-1">Patent Status Definitions:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><strong>Not Filed:</strong> No patent application has been submitted.</li>
                  <li><strong>Prior Art Search Done:</strong> Research conducted to check for existing similar inventions.</li>
                  <li><strong>Provisional Filed:</strong> A provisional patent application has been filed (secures filing date, 1-year to file non-provisional).</li>
                  <li><strong>Drafting Full Patent:</strong> Actively preparing the non-provisional (full) patent application.</li>
                  <li><strong>Full Patent Filed:</strong> The non-provisional (full) patent application has been submitted.</li>
                  <li><strong>Patented:</strong> The patent has been granted.</li>
                  <li><strong>Other:</strong> Any other status not covered above.</li>
                </ul>
              </div>
            </InfoToolTip>
          </span>
        </span>
      ),
      type: 'select',
      options: patentStatusOptions,
      required: true,
    },
    {
      name: 'technical_readiness_level',
      label: (
        <span className="flex items-center">
          Technical Readiness Level (TRL) <span className="ml-1 text-orange-500">*</span>
          <span className="ml-2">
            <InfoToolTip position="right" width={400}>
              <div className="text-left">
                <p className="font-semibold mb-1">TRL Definitions (Life Sciences Focus):</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  <li><strong>TRL 1: Basic Research:</strong> Scientific principles observed, initial concept. (e.g., initial discovery of a biological pathway or compound effect).</li>
                  <li><strong>TRL 2: Concept Formulation:</strong> Technology concept and/or application hypothesized. (e.g., hypothesis on how a compound could treat a disease).</li>
                  <li><strong>TRL 3: Proof-of-Concept (Lab):</strong> Key functions/characteristics demonstrated *in vitro* or with early *in silico* models. (e.g., lab tests show compound activity against a target).</li>
                  <li><strong>TRL 4: Component Validation (Lab):</strong> Initial *in vivo* studies (e.g., small animal models) or advanced *in vitro* models validate key components/activity.</li>
                  <li><strong>TRL 5: Preclinical Validation:</strong> Candidate (drug, device, diagnostic) shows efficacy and safety in relevant preclinical models (e.g., established animal disease models, GLP tox studies initiated).</li>
                  <li><strong>TRL 6: Early Clinical/Regulated Production:</strong> Prototype/candidate manufactured under GMP-like conditions; IND/IDE submitted; Phase 0/1 human safety trials or equivalent for device/diagnostic.</li>
                  <li><strong>TRL 7: Clinical Demonstration:</strong> Phase 2 clinical trials demonstrating efficacy and safety in target population; device/diagnostic validation in relevant human studies.</li>
                  <li><strong>TRL 8: System Complete & Qualified:</strong> Phase 3 clinical trials completed; regulatory submissions (NDA/BLA/PMA) prepared or under review.</li>
                  <li><strong>TRL 9: Market Approved & Proven:</strong> Technology approved by regulatory bodies (e.g., FDA, EMA) and proven effective in the market/clinical practice.</li>
                </ul>
              </div>
            </InfoToolTip>
          </span>
        </span>
      ),
      type: 'select',
      options: trlOptions.map((trl) => `TRL ${trl}`),
      required: true,
    },
    {
      name: 'fullname',
      label: (
        <>
          Full Name <span className="text-orange-500">*</span>
        </>
      ),
      type: 'text',
      placeholder: 'e.g., Jane Doe',
      required: true,
    },
    {
      name: 'contact_email',
      label: (
        <>
          Contact Email <span className="text-orange-500">*</span>
        </>
      ),
      type: 'email',
      placeholder: 'your.email@example.com',
      required: true,
    },
  ],
];

const LOCAL_STORAGE_KEY = 'ideaFormDataDraft';

interface SubmittedIdeaDetails {
  title: string;
  id: string | number;
}

export default function SubmitIdeaPage() {
  const [formData, setFormData] = useState<IdeaFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0); // 0-indexed for formSteps array
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<
    Partial<Record<keyof IdeaFormData, string>>
  >({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedIdeaDetails, setSubmittedIdeaDetails] = useState<SubmittedIdeaDetails | null>(null);
  const wallet = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse saved form data:', e);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
      }
    }
  }, []);

  // Save to local storage on formData change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    const inputType = e.target.type;

    if (name === 'attachmentFiles' && inputType === 'file') {
      const fileInput = e.target as HTMLInputElement;
      const newSelectedFiles = fileInput.files ? Array.from(fileInput.files) : [];
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      const currentFiles = formData.attachmentFiles || [];
      const validationErrors: string[] = [];

      const filesToAdd: File[] = [];

      newSelectedFiles.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
          validationErrors.push(`${file.name}: Exceeds 5MB limit.`);
          return;
        }
        if (currentFiles.find(f => f.name === file.name && f.size === file.size) || 
            filesToAdd.find(f => f.name === file.name && f.size === file.size)) {
          validationErrors.push(`${file.name}: Already selected.`);
          return;
        }
        filesToAdd.push(file);
      });

      if (validationErrors.length > 0) {
        setStepErrors(prev => ({
          ...prev,
          [name]: validationErrors.join(' '),
        }));
      } else if (stepErrors[name as keyof IdeaFormData]) {
        // Clear previous errors if current batch is fine
        setStepErrors(prev => ({ ...prev, [name]: undefined }));
      }
      
      // Only add validated files
      if (filesToAdd.length > 0) {
        setFormData(prev => ({
          ...prev,
          attachmentFiles: [...currentFiles, ...filesToAdd],
        }));
      }
      
      fileInput.value = ''; // Clear the input to allow re-selecting the same file if removed

    } else if (inputType !== 'file') { // Ensure this condition is for non-file inputs
      const { value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
      if (stepErrors[name as keyof IdeaFormData]) {
        setStepErrors(prev => ({ ...prev, [name]: undefined }));
      }
    }
    setError(null);
  };

  const validateStep = (stepIndex: number): boolean => {
    const currentFields = formSteps[stepIndex];
    const newErrors: Partial<Record<keyof IdeaFormData, string>> = {};
    let isValid = true;

    currentFields.forEach((field) => {
      const fieldValue = formData[field.name];
      if (field.required) {
        if (field.type === 'file') { // For file type, check if the File object exists
          if (!fieldValue) {
            newErrors[field.name] = `${field.label} is required.`;
            isValid = false;
          }
        } else if (typeof fieldValue === 'string') { // For other types, check if string is empty after trim
          if (!fieldValue.trim()) {
            newErrors[field.name] = `${field.label} is required.`;
            isValid = false;
          }
        } else if (!fieldValue) { // Catch all for other empty non-string, non-file values if any (should not happen with current types)
            newErrors[field.name] = `${field.label} is required.`;
            isValid = false;
        }
      }

      if (
        field.type === 'email' &&
        fieldValue && typeof fieldValue === 'string' && // Ensure fieldValue is a string before regex test
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)
      ) {
        newErrors[field.name] = 'Please enter a valid email address.';
        isValid = false;
      }
    });
    setStepErrors(newErrors);
    return isValid;
  };

  const handleNextStep = () => {
    console.log('handleNextStep called. currentStep:', currentStep);
    if (validateStep(currentStep)) {
      console.log('Validation passed for step:', currentStep);
      if (currentStep < formSteps.length - 1) {
        setCurrentStep(currentStep + 1);
        console.log('Moved to next step. New currentStep:', currentStep + 1);
      } else {
        console.log('Already on the last step, cannot move next.');
      }
    } else {
      console.log('Validation failed for step:', currentStep);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setStepErrors({}); // Clear errors when going back
      setError(null);
    }
  };

  const handleRemoveFile = (fileIndexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      attachmentFiles: (prev.attachmentFiles || []).filter((_, index) => index !== fileIndexToRemove),
    }));
    // If all files are removed and there was an error for 'attachmentFiles', clear it.
    const remainingFiles = (formData.attachmentFiles || []).length -1;
    if (remainingFiles === 0 && stepErrors.attachmentFiles) {
        setStepErrors(prev => ({...prev, attachmentFiles: undefined}));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    console.log('handleSubmit called. currentStep:', currentStep, 'Event type:', e.type, 'Target:', e.target);
    e.preventDefault();
    setError(null);

    if (!validateStep(currentStep)) {
      // Validate final step before submission
      return;
    }

    if (!wallet.state.isConnected || !wallet.state.address) {
      setError('Please connect your wallet to submit an idea.');
      return;
    }

    setIsLoading(true);

    // Ensure TRL is correctly formatted if it was displayed as "TRL X"
    let trlValue = formData.technical_readiness_level;
    if (formData.technical_readiness_level.startsWith('TRL ')) {
      trlValue = formData.technical_readiness_level.substring(4);
    }

    // Prepare data for submission
    const dataToSend = new FormData();

    // Append text fields. Create a temporary object without the file.
    const textData: Record<string, string | number | null> = {};
    for (const key in formData) {
      if (key !== 'attachmentFiles' && Object.prototype.hasOwnProperty.call(formData, key)) {
        const value = formData[key as keyof IdeaFormData];
        if (typeof value === 'string' || typeof value === 'number' || value === null) {
          textData[key] = value;
        }
      }
    }
    
    const submissionTextData = {
      ...textData,
      submitter_wallet_address: wallet.state.address,
      attachments: formData.attachments_description
        ? { description: formData.attachments_description }
        : null,
      technical_readiness_level: Number.parseInt(trlValue, 10),
    };

    Object.entries(submissionTextData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
         // Special handling for the 'attachments' field which might be an object
        if (key === 'attachments' && typeof value === 'object') {
          dataToSend.append(key, JSON.stringify(value));
        } else {
          dataToSend.append(key, String(value));
        }
      }
    });
    
    // Append the files if they exist
    if (formData.attachmentFiles && formData.attachmentFiles.length > 0) {
      formData.attachmentFiles.forEach((file) => {
        dataToSend.append('attachmentFile', file, file.name); // Backend handles multiple files with this key
      });
    }

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        // Content-Type header is automatically set by the browser for FormData
        body: dataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to submit idea. Please try again.');
      } else {
        setSubmittedIdeaDetails({ title: result.idea.title, id: result.idea.id });
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError(
        'An unexpected error occurred. Please check the console and try again.'
      );
    }
    setIsLoading(false);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSubmittedIdeaDetails(null);
    setFormData(initialFormData); // Reset form
    localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear local storage
    setCurrentStep(0); // Reset to first step
    // No need to manually clear file input DOM element here, as initialFormData clears state
    // and fileInput.value = '' in handleChange handles re-selection scenarios.
    // router.push('/'); // Optional: redirect after success
  };

  const renderField = (field: FormField) => {
    const fieldValue = formData[field.name];
    const commonInputProps = {
      name: field.name,
      id: field.name,
      onChange: handleChange,
      className: `mt-1 block w-full px-4 py-3 bg-seaBlue-1050/80 backdrop-blur-sm border ${stepErrors[field.name] ? 'border-fieryRed' : 'border-seaBlue-900'} rounded-lg text-sm shadow-sm placeholder-seaBlue-400 text-seaBlue-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 disabled:bg-seaBlue-1000 disabled:text-seaBlue-500 disabled:border-seaBlue-900`,
      placeholder: field.placeholder,
      disabled: isLoading,
      required: field.required,
    };

    return (
      <div key={field.name} className="mb-6">
        <label
          htmlFor={field.name}
          className="mb-1 block text-sm font-medium text-seaBlue-200"
        >
          {field.label}
          {typeof field.label === 'string' && field.required && <span className="text-orange-500"> *</span>}
        </label>
        {field.type === 'textarea' ? (
          <textarea {...commonInputProps} value={typeof fieldValue === 'string' ? fieldValue : ''} rows={field.rows || 3}></textarea>
        ) : field.type === 'select' ? (
          <select {...commonInputProps} value={typeof fieldValue === 'string' ? fieldValue : ''}>
            {field.name === 'technical_readiness_level' && (
              <option value="">Select TRL</option>
            )}
            {field.name === 'patent_status' && (
              <option value="">Select Status</option>
            )}
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : field.type === 'file' && field.name === 'attachmentFiles' ? (
          <>
            <input
              type="file"
              id={field.name}
              name={field.name}
              multiple
              onChange={handleChange}
              className="hidden" // Make it non-interactive and hidden
              ref={fileInputRef}
              disabled={isLoading}
              // Consider adding an 'accept' attribute for specific file types if needed
              // e.g., accept=".pdf,.doc,.docx,image/*"
            />

            {/* Custom button and file status text container */}
            <div className={`mt-1 flex items-center gap-x-4 ${stepErrors[field.name] ? 'rounded-lg border border-fieryRed p-2 ring-1 ring-fieryRed' : 'border border-transparent p-2'}`}> {/* Added p-2 to match input padding, border transparent when no error for layout consistency */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-full border-0 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 cursor-pointer disabled:opacity-50 ${isLoading ? 'cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                Choose Files
              </button>
              <span className="text-sm text-seaBlue-300">
                {formData.attachmentFiles && formData.attachmentFiles.length > 0
                  ? `${formData.attachmentFiles.length} file(s) selected`
                  : 'No file chosen (Max 5MB per file)'}
              </span>
            </div>

            {/* Display selected files (existing logic) */}
            {(formData.attachmentFiles || []).length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-seaBlue-200">Selected files:</p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {(formData.attachmentFiles || []).map((file, index) => (
                    <li key={index} className="text-xs text-seaBlue-300 flex justify-between items-center group bg-seaBlue-1000/30 px-2 py-1 rounded">
                      <span className="truncate max-w-[calc(100%-60px)]" title={file.name}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="ml-2 px-2 py-0.5 text-fieryRed/70 hover:text-fieryRed transition-colors text-xs rounded-sm hover:bg-fieryRed/20"
                        aria-label={`Remove ${file.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <input type={field.type} {...commonInputProps} value={typeof fieldValue === 'string' ? fieldValue : ''} />
        )}
        {stepErrors[field.name] && (
          <p className="mt-1 text-xs text-fieryRed">{stepErrors[field.name]}</p>
        )}
      </div>
    );
  };

  const buttonStylePrimary =
    'group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full text-white font-bold text-lg transition-all duration-300 hover:shadow-glow-fieryRed-limited overflow-hidden cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed';
  const buttonStyleSecondary =
    'group relative w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-seaBlue-500 rounded-full text-seaBlue-300 font-bold text-lg transition-all duration-300 hover:text-white hover:border-tropicalBlue hover:shadow-glow-tropicalBlue-limited cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed';

  return (
    <div className="min-h-screen bg-gradient-to-b from-seaBlue-1100 to-seaBlue-1050 text-white">
      <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 text-center">
            <h1 className="mb-4 animate-gradient-x bg-gradient-to-r from-orange-500 via-orange-400 to-white bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              SUBMIT YOUR IDEA
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-seaBlue-300 sm:text-lg">
              Share your innovative concept with our legal team and take the
              first step toward bringing it to life.
            </p>
          </div>

          {(!wallet.state.isVerified ||
            !wallet.state.address) && (
              <div className="mb-8 rounded-xl border border-orange-500/30 bg-seaBlue-1000/70 p-6 text-center text-seaBlue-200 shadow-glow-fieryRed-limited backdrop-blur-sm">
                <p className="mb-2 text-lg font-semibold">
                  Connect Your Wallet
                </p>
                <p className="mb-4">
                  Please connect your wallet to submit an idea and join our
                  ecosystem.
                </p>
                {/* Consider adding a wallet connect button here if not globally available */}
              </div>
            )}

          <div className="rounded-2xl border border-seaBlue-900/50 bg-seaBlue-1000/50 p-4 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-8">
              <p className="mb-2 text-center font-medium text-seaBlue-300">
                Step {currentStep + 1} of {formSteps.length}
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-seaBlue-900/50">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-white transition-all duration-300 ease-out"
                  style={{
                    width: `${((currentStep + 1) / formSteps.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formSteps[currentStep].map((field) => renderField(field))}

              {error && (
                <div className="my-6 rounded-lg border border-fieryRed/50 bg-seaBlue-1000/70 p-4 text-sm text-fieryRed shadow-glow-fieryRed-limited">
                  {error}
                </div>
              )}

              <div
                className={`mt-10 flex flex-col sm:flex-row ${currentStep === 0 ? 'justify-end' : 'justify-between'} items-center gap-6`}
              >
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className={buttonStyleSecondary}
                    disabled={isLoading}
                  >
                    <span className="flex items-center">
                      <ChevronLeft className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
                      Previous
                    </span>
                  </button>
                )}

                {currentStep < formSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                        console.log('Next button clicked directly. currentStep before handleNextStep:', currentStep);
                        handleNextStep();
                    }}
                    className={buttonStylePrimary}
                    disabled={isLoading || (currentStep === 0 && (!wallet.state.isVerified || !wallet.state.address))}
                  >
                    <span className="relative z-10 flex items-center">
                      Next
                      <ChevronRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                    <span className="absolute inset-0 origin-left scale-x-0 transform bg-gradient-to-r from-orange-500 to-orange-400 transition-transform duration-500 group-hover:scale-x-100"></span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async (event) => {
                        console.log('Submit Idea button (type=button) clicked. currentStep:', currentStep);
                        if (validateStep(currentStep)) {
                            const form = event.currentTarget.closest('form');
                            if (form) {
                                await handleSubmit({
                                    preventDefault: () => { console.log("Synthetic event: preventDefault called"); },
                                    currentTarget: form,
                                    target: form,
                                    stopPropagation: () => { console.log("Synthetic event: stopPropagation called"); },
                                } as unknown as FormEvent<HTMLFormElement>);                            
                            } else {
                                console.error("Submit Idea button: Could not find parent form element.");
                                setError("An error occurred submitting the form. Please try again.");
                            }
                        }
                    }}
                    disabled={!wallet.state.isVerified || !wallet.state.address || isLoading}
                    className={buttonStylePrimary}
                  >
                    <span className="relative z-10 flex items-center">
                      {isLoading ? 'Submitting...' : 'Submit Idea'}
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                    <span className="absolute inset-0 origin-left scale-x-0 transform bg-gradient-to-r from-orange-500 to-orange-400 transition-transform duration-500 group-hover:scale-x-100"></span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      {submittedIdeaDetails && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccessModal}
          title={submittedIdeaDetails.title}
          ideaId={submittedIdeaDetails.id}
        />
      )}
    </div>
  );
}
