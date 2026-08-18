export interface LandingCopy {
  lang: string;
  title: string;
  description: string;
  hero: {
    badge: string;
    title: string;
    tagline: string;
    install: string;
    primaryCta: string;
    secondaryCta: string;
  };
  features: {
    heading: string;
    subheading: string;
    items: Array<{ title: string; text: string }>;
  };
  usage: {
    heading: string;
    text: string;
    command: string;
    note: string;
  };
  config: {
    heading: string;
    text: string;
    example: string;
    note: string;
  };
  ai: {
    heading: string;
    text: string;
    cloud: string;
    cloudItems: string[];
    local: string;
    localItems: string[];
    offline: string;
  };
  footer: {
    github: string;
    excelso: string;
    license: string;
  };
}
