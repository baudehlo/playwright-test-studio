import { Download, Github, Menu, Star } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Documentation', href: '#documentation' },
  ];

  const NavItems = ({ mobile = false }) => (
    <>
      {navLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          onClick={() => mobile && setIsOpen(false)}
          className={`
            ${mobile ? 'block py-3 text-lg border-b border-border/50' : 'text-sm'} 
            font-medium text-muted-foreground hover:text-foreground transition-colors
          `}
        >
          {link.name}
        </a>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-colors">
      <div className="section-container">
        <div className="flex h-16 items-center justify-between">
          <a href="#home" className="flex items-center space-x-2.5">
            <div className="bg-primary p-1.5 rounded-md">
              <BotIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Playwright Test Studio
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavItems />
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <a
              href="https://github.com/baudehlo/playwright-test-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs transition-colors">
                <Star className="w-3 h-3 fill-current" /> Star
              </span>
            </a>
            <Button asChild size="sm">
              <a
                href="https://github.com/baudehlo/playwright-test-studio/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Now
              </a>
            </Button>
          </div>

          {/* Mobile Nav */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Menu"
                className="text-foreground"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[80vw] sm:w-[350px] bg-background border-border"
            >
              <div className="flex flex-col h-full">
                <div className="py-6 flex items-center space-x-2">
                  <div className="bg-primary p-1 rounded">
                    <BotIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-foreground">
                    Playwright Test Studio
                  </span>
                </div>
                <nav className="flex flex-col space-y-2 flex-grow">
                  <NavItems mobile />
                </nav>
                <div className="flex flex-col gap-3 mt-auto pb-6">
                  <Button
                    variant="outline"
                    asChild
                    className="w-full justify-start"
                  >
                    <a
                      href="https://github.com/baudehlo/playwright-test-studio"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="w-4 h-4 mr-2" />
                      GitHub Repository
                    </a>
                  </Button>
                  <Button asChild className="w-full justify-start">
                    <a
                      href="https://github.com/baudehlo/playwright-test-studio/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Now
                    </a>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

// Extracted simple icon for branding consistency
function BotIcon(props) {
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
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

export default Header;
