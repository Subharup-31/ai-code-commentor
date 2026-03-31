import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#030712] pt-20 pb-10 border-t border-white/5 relative z-10">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <Link href="/" className="inline-block text-xl font-bold tracking-tight mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">
                COMMGEN
              </span>
            </Link>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              AI-Powered Code Comment Generation for modern engineering teams. Ship faster, document better.
            </p>
            <div className="flex space-x-4">
              {/* GitHub */}
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .08 1.53 1.04 1.53 1.04.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" clipRule="evenodd" /></svg>
              </a>
              {/* Twitter */}
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">API Reference</Link></li>
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Community</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Company</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">About</Link></li>
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} COMMGEN Inc. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-gray-500">
            <span>made for developers by the developers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
