import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Braces,
  Code2,
  Download,
  FileText,
  FolderTree,
  History,
  Image as ImageIcon,
  Laptop,
  Settings,
  Sparkles,
} from 'lucide-react';
import React from 'react';
import AIProviderBadge from '@/components/AIProviderBadge.jsx';
import FeatureCard from '@/components/FeatureCard.jsx';
import { Button } from '@/components/ui/button';

const HomePage = () => {
  const features = [
    {
      icon: FileText,
      title: 'Plain English Test Scripts',
      description:
        'Write your browser interactions exactly as you would describe them to a human tester. No CSS selectors or xpath required.',
      badge: 'Core',
    },
    {
      icon: Laptop,
      title: 'Local App Testing',
      description:
        'Test locally running applications without deploying to production. The desktop app gives you full access to localhost and internal services. Perfect for testing during development.',
      badge: 'Desktop Advantage',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Execution',
      description:
        'Your chosen AI model interprets the instructions and dynamically translates them into robust Playwright commands in real-time.',
    },
    {
      icon: FolderTree,
      title: 'Hierarchical Collections',
      description:
        'Organize your test suites logically with folders, sub-folders, and categorized collections for easy management.',
    },
    {
      icon: Braces,
      title: 'Variable Expansion',
      description:
        'Use ${varName} syntax to dynamically inject data into your plain English scripts, supporting complex data-driven testing.',
    },
    {
      icon: ImageIcon,
      title: 'Automatic Screenshots',
      description:
        'Visual evidence is captured automatically at key interaction points and upon any test failure for easy debugging.',
    },
    {
      icon: History,
      title: 'Run History & Analytics',
      description:
        'Track pass/fail rates over time. Review past executions with detailed logs and visual playback of the test steps.',
    },
    {
      icon: AlertCircle,
      title: 'HTTP Failure Logging',
      description:
        'Automatically intercepts and logs failed network requests (4xx, 5xx) that occur during the test execution.',
    },
    {
      icon: Settings,
      title: 'GUI-Based Configuration',
      description:
        'Configure timeouts, viewport sizes, AI model selection, and API keys entirely through a familiar, intuitive interface.',
    },
  ];

  const workflowSteps = [
    {
      title: 'Write in Plain English',
      description:
        'Describe the user journey: "Go to the login page, enter my credentials, and click submit."',
    },
    {
      title: 'AI Interprets Intent',
      description:
        'The AI model analyzes the DOM and determines the most resilient way to perform the action.',
    },
    {
      title: 'Browser Automation',
      description:
        'Playwright executes the translated commands against a real, visible browser instance.',
    },
    {
      title: 'Capture Results',
      description:
        'Screenshots, logs, and assertions are recorded and presented in the run history dashboard.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Hero Section */}
      <section id="home" className="pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="section-container text-center">
          <div className="max-w-4xl mx-auto">
            <img
              src="/app-icon.png"
              alt="Playwright Test Studio"
              className="w-14 h-14 rounded-xl mx-auto mb-6 shadow-lg"
            />
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance text-foreground">
              Browser test automation<br className="hidden md:block" />
              in plain English.
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Write what the browser should do. Playwright Test Studio uses AI
              to execute it against a real browser — including localhost and
              internal services, directly from your desktop.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base h-12 px-8 shadow-lg shadow-primary/20"
                asChild
              >
                <a
                  href="https://github.com/baudehlo/playwright-test-studio/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download for macOS, Windows, Linux
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base h-12 px-8 bg-background hover:bg-secondary"
                asChild
              >
                <a href="#documentation">
                  <FileText className="w-5 h-5 mr-2" />
                  View Documentation
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* App screenshot */}
      <section className="pb-16">
        <div className="section-container">
          <div className="rounded-xl overflow-hidden border border-border shadow-2xl shadow-black/20">
            <img
              src="/app-screenshot.png"
              alt="Playwright Test Studio showing a plain-English test script with run results"
              className="w-full block"
            />
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 border-y border-border/50">
        <div className="section-container">
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-base font-semibold mb-2 text-foreground">Works on localhost</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                It's a native desktop app with direct access to services on your
                machine — no cloud VMs, no tunnels, no port forwarding.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2 text-foreground">No selector maintenance</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Tests describe intent, not DOM structure. The AI resolves
                elements at runtime, so tests don't break when developers rename
                classes or restructure markup.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2 text-foreground">Bring your own model</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Plug in an API key for OpenAI, Anthropic, Groq, or Azure.
                Switch models any time to trade off speed, cost, and capability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="section-container">
          <div className="mb-16 md:flex md:justify-between md:items-end">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-foreground">
                Key Features
              </h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to build, manage, and execute automated test
                suites without touching a single line of code.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true, margin: '-50px' }}
              >
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Providers Section */}
      <section className="py-20 bg-secondary/30 transition-colors">
        <div className="section-container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
            Bring Your Own AI
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
            Playwright Test Studio doesn't lock you into a specific model.
            Configure your API key in the GUI and choose the provider that fits
            your budget and speed requirements.
          </p>
          <div className="flex flex-wrap justify-center gap-4 items-center">
            <AIProviderBadge
              name="OpenAI"
              href="https://platform.openai.com/docs"
            />
            <AIProviderBadge
              name="Anthropic"
              href="https://docs.anthropic.com/"
            />
            <AIProviderBadge name="Groq" href="https://console.groq.com/docs" />
            <AIProviderBadge
              name="Azure OpenAI"
              href="https://learn.microsoft.com/en-us/azure/ai-services/openai/"
            />
            <AIProviderBadge name="xAI" href="https://docs.x.ai/" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24">
        <div className="section-container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-foreground">
              How it Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Four steps, no configuration files, no selectors to maintain.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {workflowSteps.map((step, index) => (
              <div key={index} className="relative">
                {index < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-full h-px bg-border transition-colors">
                    <div className="absolute right-0 -top-1.5 w-3 h-3 rounded-full bg-border transition-colors" />
                  </div>
                )}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-6 shadow-lg shadow-primary/20">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started & Documentation */}
      <section
        id="documentation"
        className="py-24 bg-card border-t border-border transition-colors"
      >
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight text-foreground">
                Getting Started
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Up and running in less than 5 minutes. No Node.js environment or
                complex dependencies required.
              </p>

              <div className="space-y-8 counter-reset-step">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-semibold step-counter transition-colors" />
                  <div>
                    <h4 className="text-lg font-semibold mb-1 text-foreground">
                      Download & Install
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      Download the latest release for your OS (macOS, Windows,
                      or Linux) and install the application.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-semibold step-counter transition-colors" />
                  <div>
                    <h4 className="text-lg font-semibold mb-1 text-foreground">
                      Configure Provider API Key
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      Open settings in the GUI and paste your API key from
                      OpenAI, Anthropic, Groq, or your preferred provider.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold step-counter shadow-sm transition-colors" />
                  <div>
                    <h4 className="text-lg font-semibold mb-1 text-foreground">
                      Write Your First Test
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      Create a new test suite, type out your scenario in plain
                      English, and hit the Play button to run locally.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-2xl p-8 lg:p-10 border border-border/50 transition-colors">
              <h3 className="text-2xl font-semibold mb-6 text-foreground">
                Resources
              </h3>

              <div className="space-y-4">
                <a
                  href="https://github.com/baudehlo/playwright-test-studio/blob/main/README.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-background rounded-xl border border-border hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <BookOpenIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      README
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                </a>

                <a
                  href="https://github.com/baudehlo/playwright-test-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-background rounded-xl border border-border hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Code2 className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      GitHub Repository
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                </a>

                <a
                  href="https://github.com/baudehlo/playwright-test-studio/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-background rounded-xl border border-border hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      Latest Releases
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 border-t border-border">
        <div className="section-container text-center max-w-2xl mx-auto">
          <img
            src="/app-icon.png"
            alt=""
            className="w-12 h-12 rounded-xl mx-auto mb-6"
          />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Ready to stop maintaining selectors?
          </h2>
          <p className="text-muted-foreground mb-8">
            Download the app, paste an API key, write a sentence. That's it.
          </p>
          <Button size="lg" className="h-12 px-10 text-base shadow-lg shadow-primary/20" asChild>
            <a
              href="https://github.com/baudehlo/playwright-test-studio/releases"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Playwright Test Studio
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
};

function BookOpenIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export default HomePage;
