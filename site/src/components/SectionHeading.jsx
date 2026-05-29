
import React from 'react';

const SectionHeading = ({ title, description, centered = true }) => {
  return (
    <div className={`mb-12 ${centered ? 'text-center' : ''} transition-colors`}>
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance text-foreground" style={{letterSpacing: '-0.02em'}}>
        {title}
      </h2>
      {description && (
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
