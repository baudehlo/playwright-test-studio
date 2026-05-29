import React from 'react';
import { Helmet } from 'react-helmet';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider.jsx';
import { Toaster } from '@/components/ui/sonner';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import HomePage from './pages/HomePage.jsx';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Helmet>
          <title>Playwright Test Studio | AI-Powered Browser Automation</title>
          <meta
            name="description"
            content="Write automated browser tests in plain English. Playwright Test Studio uses AI to translate natural language into robust Playwright test scripts. No coding required."
          />
        </Helmet>

        <div className="flex flex-col min-h-screen selection:bg-primary/20 selection:text-primary bg-background text-foreground transition-colors">
          <Header />
          <main className="flex-grow flex flex-col">
            <Routes>
              <Route path="/" element={<HomePage />} />
              {/* Catch-all route */}
              <Route
                path="*"
                element={
                  <div className="flex-grow flex items-center justify-center p-8 text-center bg-background">
                    <div>
                      <h1 className="text-4xl font-bold mb-4 text-foreground">
                        404 - Page Not Found
                      </h1>
                      <p className="text-muted-foreground mb-6">
                        The page you're looking for doesn't exist or has been
                        moved.
                      </p>
                      <a
                        href="/"
                        className="text-primary hover:underline font-medium"
                      >
                        Return Home
                      </a>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
