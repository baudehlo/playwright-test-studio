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
            <img src="/app-icon.png" alt="" className="w-8 h-8 rounded-lg" />
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
                  <img src="/app-icon.png" alt="" className="w-7 h-7 rounded-md" />
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

export default Header;
