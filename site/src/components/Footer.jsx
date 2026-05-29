import { Bug, DownloadCloud, FileText, Github, Sparkles } from 'lucide-react';
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 py-16 border-t border-slate-200 dark:border-slate-900 transition-colors">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2.5 mb-6">
              <div className="bg-primary p-1.5 rounded-md">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Playwright Test Studio
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6 text-sm">
              The AI-powered browser automation tool that lets you write
              reliable tests in plain English. Test locally running
              applications, internal services, or production environments
              directly from your desktop. No coding required.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/baudehlo/playwright-test-studio"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-slate-900 dark:text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Project
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/baudehlo/playwright-test-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
                >
                  <Github className="w-4 h-4" /> Source Code
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/baudehlo/playwright-test-studio/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
                >
                  <DownloadCloud className="w-4 h-4" /> Releases
                </a>
              </li>
              <li>
                <a
                  href="#documentation"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/baudehlo/playwright-test-studio/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
                >
                  <Bug className="w-4 h-4" /> Issue Tracker
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-slate-900 dark:text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              AI Providers
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://platform.openai.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  OpenAI Docs
                </a>
              </li>
              <li>
                <a
                  href="https://docs.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Anthropic Docs
                </a>
              </li>
              <li>
                <a
                  href="https://console.groq.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Groq Docs
                </a>
              </li>
              <li>
                <a
                  href="https://learn.microsoft.com/en-us/azure/ai-services/openai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Azure OpenAI Docs
                </a>
              </li>
              <li>
                <a
                  href="https://docs.x.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  xAI Docs
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            © {currentYear} Playwright Test Studio. Released under open source
            license.
          </p>
          <div className="flex gap-6">
            <span className="text-sm text-slate-500">
              Tested with Playwright
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
