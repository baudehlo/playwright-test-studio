import { Bot, Brain, Cpu, Network, Sparkles } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';

const providerConfig = {
  OpenAI: { icon: Brain, color: 'text-emerald-600 dark:text-emerald-500' },
  Anthropic: { icon: Sparkles, color: 'text-amber-600 dark:text-amber-500' },
  Groq: { icon: Cpu, color: 'text-orange-600 dark:text-orange-500' },
  'Azure OpenAI': { icon: Network, color: 'text-blue-600 dark:text-blue-500' },
  xAI: { icon: Bot, color: 'text-slate-600 dark:text-slate-400' },
};

const AIProviderBadge = ({ name, href }) => {
  const config = providerConfig[name] || { icon: Bot, color: 'text-primary' };
  const Icon = config.icon;

  const BadgeContent = (
    <Badge
      variant="outline"
      className="px-3 py-1.5 flex items-center gap-2 hover:bg-secondary transition-colors cursor-pointer bg-background text-foreground border-border hover:border-border/80"
    >
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className="font-medium">{name}</span>
    </Badge>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        {BadgeContent}
      </a>
    );
  }

  return BadgeContent;
};

export default AIProviderBadge;
