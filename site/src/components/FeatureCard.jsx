import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const FeatureCard = ({ icon: Icon, title, description, badge }) => {
  return (
    <Card className="group relative overflow-hidden bg-card border-border transition-all duration-300 hover:shadow-lg hover:border-primary/50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-6 flex flex-col h-full relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-secondary rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Icon className="w-6 h-6" />
          </div>
          {badge && (
            <Badge
              variant="secondary"
              className="font-medium bg-secondary text-secondary-foreground"
            >
              {badge}
            </Badge>
          )}
        </div>
        <h3 className="text-xl font-semibold mb-2 text-foreground tracking-tight transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed flex-grow text-sm md:text-base transition-colors">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;
