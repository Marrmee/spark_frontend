/**
 * Spark Platform - AccessGate Usage Examples
 * 
 * Demonstrates how to use the AccessGate component to protect different
 * types of content with various NDA attestation requirements.
 */

'use client';

import React from 'react';
import AccessGate from '../AccessGate';
import { NDAAthestationLevel } from '../types/access-control';

const AccessGateExample: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Spark Access Control Examples
        </h1>
        <p className="text-gray-600">
          These examples demonstrate the different NDA attestation levels and access controls.
        </p>
      </div>

      {/* Public Content - No NDA Required */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Public Content</h2>
        <AccessGate requiredAccess={NDAAthestationLevel.NONE}>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Welcome to Spark Platform</h3>
            <p className="text-gray-700">
              This is public content that anyone can view. No NDA attestation required.
              You can see general information about the platform, public statistics, and announcements.
            </p>
          </div>
        </AccessGate>
      </div>

      {/* Platform NDA Required */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Platform Features</h2>
        <AccessGate requiredAccess={NDAAthestationLevel.PLATFORM_NDA}>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Platform Member Content</h3>
            <p className="text-blue-700">
              🎉 Congratulations! You have signed the Platform NDA and can now access:
            </p>
            <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
              <li>Platform feature access</li>
              <li>Basic idea browsing</li>
              <li>Community discussions</li>
              <li>User profiles and settings</li>
            </ul>
          </div>
        </AccessGate>
      </div>

      {/* Ideator Terms Required */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Idea Submission</h2>
        <AccessGate requiredAccess={NDAAthestationLevel.IDEATOR_TERMS}>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Ideator Dashboard</h3>
            <p className="text-green-700">
              💡 You have signed the Ideator Terms and can now:
            </p>
            <ul className="list-disc list-inside text-green-700 mt-2 space-y-1">
              <li>Submit research ideas</li>
              <li>Manage your idea portfolio</li>
              <li>Track submission history</li>
              <li>Monitor revenue potential</li>
            </ul>
            <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Submit New Idea
            </button>
          </div>
        </AccessGate>
      </div>

      {/* Both Platform Agreements Required */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Full Platform Access</h2>
        <AccessGate requiredAccess={NDAAthestationLevel.BOTH_PLATFORM}>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900 mb-2">Premium Features</h3>
            <p className="text-purple-700">
              ⭐ You have full platform access! You can now:
            </p>
            <ul className="list-disc list-inside text-purple-700 mt-2 space-y-1">
              <li>Access all platform features</li>
              <li>View draft ideas from other contributors</li>
              <li>Submit and manage your own ideas</li>
              <li>Participate in governance voting</li>
              <li>Access advanced analytics</li>
            </ul>
            <div className="mt-4 space-x-2">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Browse Draft Ideas
              </button>
              <button className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50">
                View Analytics
              </button>
            </div>
          </div>
        </AccessGate>
      </div>

      {/* Idea-Specific NDA Required */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Confidential Idea Content</h2>
        <AccessGate 
          requiredAccess={NDAAthestationLevel.IDEA_SPECIFIC_NDA}
          ideaId="12345"
        >
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-medium text-orange-900 mb-2">Research Idea #12345</h3>
            <p className="text-orange-700">
              🔐 You have signed the idea-specific NDA and can now access:
            </p>
            <ul className="list-disc list-inside text-orange-700 mt-2 space-y-1">
              <li>Detailed research methodology</li>
              <li>Technical specifications</li>
              <li>Preliminary research data</li>
              <li>Commercial potential analysis</li>
              <li>Due diligence materials</li>
            </ul>
            <div className="mt-4 p-3 bg-orange-100 rounded border-l-4 border-orange-500">
              <p className="text-sm text-orange-800">
                <strong>Confidential:</strong> This information is protected under idea-specific NDA #12345.
                Do not share or reproduce without authorization.
              </p>
            </div>
          </div>
        </AccessGate>
      </div>

      {/* Multiple Access Levels Example */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Flexible Access Control</h2>
        <AccessGate 
          requiredAccess={[
            NDAAthestationLevel.PLATFORM_NDA,
            NDAAthestationLevel.IDEATOR_TERMS
          ]}
        >
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-medium text-indigo-900 mb-2">Multi-Level Protected Content</h3>
            <p className="text-indigo-700">
              This content requires either Platform NDA OR Ideator Terms (whichever you have signed).
              This demonstrates flexible access control for content that can be accessed via multiple paths.
            </p>
          </div>
        </AccessGate>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-12">
        <p>
          These examples demonstrate the Spark Platform&apos;s comprehensive NDA-based access control system.
          All attestations are verified on-chain through the AttestationVault contract.
        </p>
      </div>
    </div>
  );
};

export default AccessGateExample; 