"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Globe, 
  Shield, 
  FileText, 
  Coins, 
  Lock, 
  Lightbulb, 
  Rocket, 
  Brain, 
  Dna, 
  FlaskConical, 
  Workflow,
  Layers, 
  ChevronDown, 
  ChevronUp
} from "lucide-react"
import HexGrid from "@/app/components/general/HexGrid"
import ParticleNetwork from "@/app/components/general/ParticleNetwork"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index)
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-seaBlue-1100 to-seaBlue-1050 flex flex-col">
      <div className="relative overflow-x-hidden flex-grow">
        {/* Particle background */}
        <div className="absolute inset-0 z-0">
          <ParticleNetwork />
        </div>

        {/* Hex grid overlay */}
        <div className="absolute inset-0 z-0 opacity-20">
          <HexGrid />
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-seaBlue-700/10 blur-3xl animate-pulse-slow"></div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 pt-2 pb-20 flex flex-col items-center">
          {/* Logo and brand */}
          <div className="sm:mb-8 text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="relative">
                <Sparkles className="w-16 h-16 text-orange-500 animate-spin-slow" />
                <Zap className="absolute inset-0 w-16 h-16 text-white opacity-70 animate-spin-reverse-slow" />
              </div>
            </div>
            <h1 className="text-6xl sm:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-orange-400 to-white animate-gradient-x tracking-tight mb-4">
              SPARK
            </h1>
            <p className="text-seaBlue-200 text-xl font-proximaSemiBold tracking-wide">THE IDEA COMMITMENT ENGINE</p>
          </div>

          {/* Hero section */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl flex flex-col justify-center items-center sm:text-5xl font-acuminBold text-white mb-8 leading-tight">
              <span className="">UNLOCK UNSTOPPABLE COLLABORATION</span> <span className="text-orange-500">POWERED&nbsp;BY&nbsp;CRYPTO</span>
            </h2>
            <p className="text-xl text-seaBlue-200 mb-10 leading-relaxed max-w-3xl mx-auto">
              Spark helps inventors bring bold ideas to life by connecting them with the people, tools, and capital they
              need to succeed. Join our ecosystem and share in the upside of every contribution through our blockchain-based IP framework.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link href="/submit-idea" className="group">
                <button className="relative px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full text-white font-bold text-lg transition-all duration-300 hover:shadow-glow-fieryRed-limited overflow-hidden">
                  <span className="relative z-10 flex items-center">
                    Submit Your Idea
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-400 transform scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100"></span>
                </button>
              </Link>
              <Link href="/review-ideas" className="group">
                <button className="relative px-8 py-4 bg-transparent border-2 border-seaBlue-500 rounded-full text-seaBlue-300 font-bold text-lg transition-all duration-300 hover:text-white hover:border-tropicalBlue hover:shadow-glow-tropicalBlue-limited">
                  <span className="flex items-center">
                    Review Ideas
                    <Globe className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
                  </span>
                </button>
              </Link>
            </div>
          </div>

          {/* Key Features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto mb-20">
            {[
              {
                icon: <Sparkles className="w-10 h-10 text-orange-500" />,
                title: "Crypto-Powered Incentives",
                description: "Earn rewards for your contributions through our Proof of Impact system and SCI token.",
              },
              {
                icon: <Zap className="w-10 h-10 text-tropicalBlue" />,
                title: "Shared Upside",
                description: "Benefit directly from the success of projects you help build through tokenized licensing.",
              },
              {
                icon: <Globe className="w-10 h-10 text-seafoamGreen" />,
                title: "Global Collaboration",
                description: "Connect with innovators and experts from around the world in a transparent ecosystem.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-seaBlue-1000/50 backdrop-blur-sm border border-seaBlue-900/50 rounded-2xl p-6 hover:shadow-glow-blue-faint transition-all duration-300 hover:-translate-y-1"
              >
                <div className="bg-seaBlue-950/50 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 text-left">{feature.title}</h3>
                <p className="text-seaBlue-300">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* How It Works section */}
          <div className="w-full max-w-6xl mx-auto mb-20">
            <h2 className="text-3xl sm:text-4xl font-acuminBold text-white mb-10 text-center">
              How&nbsp;<span className="text-orange-500">Spark</span>&nbsp;Works
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="space-y-6">
                  {[
                    {
                      icon: <Lightbulb className="w-8 h-8 text-orange-500" />,
                      title: "Ideation Phase",
                      description: "Submit your idea to our expert review committee. After approval, it's shared with the community under NDA protection."
                    },
                    {
                      icon: <Rocket className="w-8 h-8 text-tropicalBlue" />,
                      title: "Bootstrapping Phase",
                      description: "Secure funding to cover patent applications and development costs through our community of contributors."
                    },
                    {
                      icon: <Workflow className="w-8 h-8 text-seafoamGreen" />,
                      title: "Acceleration Phase",
                      description: "Develop your idea with our community, earning Proof of Impact rewards for all contributions."
                    },
                    {
                      icon: <Coins className="w-8 h-8 text-orange-400" />,
                      title: "Commercialization Phase",
                      description: "Your patent becomes an IP-NFT in our defensive pool, with commercial licenses available through SCI token-gating."
                    }
                  ].map((step, index) => (
                    <div key={index} className="flex gap-4 p-4 bg-seaBlue-1000/30 backdrop-blur-sm rounded-xl border border-seaBlue-900/50">
                      <div className="bg-seaBlue-950/70 rounded-full w-12 h-12 flex-shrink-0 flex items-center justify-center">
                        {step.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
                        <p className="text-seaBlue-300">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="order-1 lg:order-2 bg-seaBlue-1000/30 backdrop-blur-sm rounded-2xl border border-seaBlue-900/50 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl -mr-20 -mt-20"></div>
                <h3 className="text-2xl font-bold text-white mb-6 relative z-10">Defensive Copyleft IP Pool</h3>
                <div className="space-y-6 relative z-10">
                  <div className="flex gap-4">
                    <Shield className="w-8 h-8 text-orange-500 flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold text-white">Defensive Patent License</h4>
                      <p className="text-seaBlue-300">Patents are used exclusively to prevent others from patenting the invention or incremental innovations.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <FileText className="w-8 h-8 text-tropicalBlue flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold text-white">Copyleft Clause</h4>
                      <p className="text-seaBlue-300">Anyone can build upon inventions in the pool as long as they share improvements back under the same conditions.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Lock className="w-8 h-8 text-seafoamGreen flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold text-white">SCI Token-Gated Commercialization</h4>
                      <p className="text-seaBlue-300">Commercial use requires obtaining a License-NFT by locking SCI tokens and paying fees through the Poscidon Protocol.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Research Focus section */}
          <div className="w-full max-w-6xl mx-auto mb-20">
            <h2 className="text-3xl sm:text-4xl font-acuminBold text-white mb-10 text-center">
              Research&nbsp;<span className="text-orange-500">Focus</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Brain className="w-10 h-10 text-orange-500" />,
                  title: "Personalized Medicine",
                  description: "Tailored treatments based on individual patient characteristics and genetic makeup."
                },
                {
                  icon: <Dna className="w-10 h-10 text-tropicalBlue" />,
                  title: "Life-Altering Diseases",
                  description: "Research focused on solid cancers, Alzheimer's, diabetes, and multiple sclerosis."
                },
                {
                  icon: <FlaskConical className="w-10 h-10 text-seafoamGreen" />,
                  title: "Blockchain Integration",
                  description: "Leveraging blockchain technology to decentralize scientific research funding."
                },
                {
                  icon: <Layers className="w-10 h-10 text-orange-400" />,
                  title: "Expanding Horizons",
                  description: "Open to groundbreaking ideas from fields beyond personalized medicine."
                }
              ].map((focus, index) => (
                <div 
                  key={index} 
                  className="bg-seaBlue-1000/50 backdrop-blur-sm border border-seaBlue-900/50 rounded-2xl p-6 hover:shadow-glow-blue-faint transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="bg-seaBlue-950/50 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                    {focus.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{focus.title}</h3>
                  <p className="text-seaBlue-300">{focus.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="w-full max-w-6xl mx-auto mb-20">
            <h2 className="text-3xl sm:text-4xl font-acuminBold text-white mb-10 text-center">
              Frequently Asked&nbsp;<span className="text-orange-500">Questions</span>
            </h2>
            
            <div className="space-y-4">
              {[
                {
                  question: "What is Spark?",
                  answer: "Spark is a blockchain-based IP framework that operates within Poscidon, a decentralized science organization (DAO) focusing on funding and commercializing personalized medicine research. It addresses the challenges of IP commercialization by bridging the gap between open collaboration and commercialization."
                },
                {
                  question: "How does the defensive patent pool work?",
                  answer: "Spark's defensive patent pool is a collection of IP-NFTs with copyleft restrictions that ensures inventions remain accessible to the public while incentivizing inventors and contributors. It includes a defensive patent license, copyleft clause, and non-commercial exploitation terms."
                },
                {
                  question: "What is the SCI token used for?",
                  answer: "The SCI token is used for governance within the Poscidon ecosystem and for commercial licensing of IP-NFTs. To use an IP-NFT commercially, users must lock SCI tokens and pay fees to mint a License-NFT, creating a sustainable funding model for continuous innovation."
                },
                {
                  question: "How can I participate in Spark's governance?",
                  answer: "To participate in governance, you need to obtain SCI tokens, lock them through the Poscidon Protocol, and sign an NDA if required. You can then vote on proposals related to idea approval, contributions, revenue distribution, and more."
                }
              ].map((faq, index) => (
                <div 
                  key={index} 
                  className="bg-seaBlue-1000/50 backdrop-blur-sm border border-seaBlue-900/50 rounded-xl overflow-hidden"
                >
                  <button 
                    className="w-full p-6 flex justify-between items-center text-left"
                    onClick={() => toggleAccordion(index)}
                  >
                    <h3 className="text-xl font-bold text-white">{faq.question}</h3>
                    {activeAccordion === index ? 
                      <ChevronUp className="w-6 h-6 text-orange-500 flex-shrink-0" /> : 
                      <ChevronDown className="w-6 h-6 text-orange-500 flex-shrink-0" />
                    }
                  </button>
                  <div 
                    className={`px-6 overflow-hidden transition-all duration-300 ${
                      activeAccordion === index ? 'max-h-96 pb-6' : 'max-h-0'
                    }`}
                  >
                    <p className="text-seaBlue-300">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="w-full max-w-6xl mx-auto bg-seaBlue-1000/70 backdrop-blur-md border border-seaBlue-900/50 rounded-2xl p-8 mb-16">
            <div className="text-center">
              <h2 className="text-3xl font-acuminBold text-white mb-4">Ready to Spark&nbsp;Innovation?</h2>
              <p className="text-xl text-seaBlue-200 mb-8 max-w-2xl mx-auto">
                Join our ecosystem today and be part of a revolutionary approach to collaborative innovation powered by blockchain technology.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link href="/submit-idea" className="group">
                  <button className="relative px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full text-white font-bold text-lg transition-all duration-300 hover:shadow-glow-fieryRed-limited overflow-hidden w-full sm:w-auto">
                    <span className="relative z-10 flex items-center justify-center">
                      Submit Your Idea
                      <Lightbulb className="ml-2 w-5 h-5" />
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-400 transform scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100"></span>
                  </button>
                </Link>
                <Link href="/whitepaper.pdf" className="group">
                  <button className="relative px-8 py-4 bg-transparent border-2 border-seaBlue-500 rounded-full text-seaBlue-300 font-bold text-lg transition-all duration-300 hover:text-white hover:border-tropicalBlue hover:shadow-glow-tropicalBlue-limited w-full sm:w-auto">
                    <span className="flex items-center justify-center">
                      Read Whitepaper
                      <FileText className="ml-2 w-5 h-5" />
                    </span>
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full text-center text-seaBlue-400 mt-auto">
            <p>© 2025 Spark | Powered by Poscidon</p>
          </footer>
        </div>
      </div>
    </main>
  )
}
