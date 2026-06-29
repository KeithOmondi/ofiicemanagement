

// ─── Link Categories ──────────────────────────────────────────────────────────

import { BarChart3, BookOpen, Building2, Calendar, Crown, ExternalLink, FileText, FolderOpen, GitBranch, Globe, Globe2, HelpCircle, List, Mail, MessageSquare, Package, RefreshCw, Search, Sparkles, Star, Users, Video, Zap } from "lucide-react";


interface ExternalLinkItem {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tags?: string[];
}

const externalLinks: ExternalLinkItem[] = [
  // ── Judicial Systems ──────────────────────────────────────────────────────
  {
    id: 'court-portal',
    name: 'Court Case Management System',
    description: 'Access and manage court cases',
    url: 'https://court-portal.judiciary.go.ke',
    icon: Building2,
    color: 'blue',
    tags: ['Judicial', 'Cases'],
  },
  {
    id: 'e-filing',
    name: 'e-Filing Portal',
    description: 'File documents online',
    url: 'https://efiling.judiciary.go.ke',
    icon: FileText,
    color: 'green',
    tags: ['Filing', 'Documents'],
  },
  {
    id: 'judgment-database',
    name: 'Judgment Database',
    description: 'Search and reference court judgments',
    url: 'https://judgments.judiciary.go.ke',
    icon: BookOpen,
    color: 'purple',
    tags: ['Judgments', 'Reference'],
  },
  {
    id: 'legal-research',
    name: 'Legal Research Portal',
    description: 'Access legal resources and research materials',
    url: 'https://research.judiciary.go.ke',
    icon: Search,
    color: 'indigo',
    tags: ['Research', 'Legal'],
  },

  // ── Government Systems ────────────────────────────────────────────────────
  {
    id: 'government-portal',
    name: 'Government Services Portal',
    description: 'Access all government services',
    url: 'https://www.egov.go.ke',
    icon: Globe,
    color: 'teal',
    tags: ['Government', 'Services'],
  },
  {
    id: 'financial-system',
    name: 'IFMIS Financial System',
    description: 'Government financial management',
    url: 'https://ifmis.treasury.go.ke',
    icon: BarChart3,
    color: 'orange',
    tags: ['Finance', 'Budget'],
  },
  {
    id: 'hr-system',
    name: 'HR Management System',
    description: 'Staff and payroll management',
    url: 'https://hr.go.ke',
    icon: Users,
    color: 'rose',
    tags: ['HR', 'Staff'],
  },
  {
    id: 'procurement-system',
    name: 'Public Procurement Portal',
    description: 'Manage procurement processes',
    url: 'https://procurement.go.ke',
    icon: Package,
    color: 'amber',
    tags: ['Procurement', 'Supplies'],
  },

  // ── Productivity Tools ────────────────────────────────────────────────────
  {
    id: 'email-system',
    name: 'Email System',
    description: 'Access work email',
    url: 'https://mail.google.com',
    icon: Mail,
    color: 'red',
    tags: ['Email', 'Communication'],
  },
  {
    id: 'calendar-system',
    name: 'Calendar & Scheduling',
    description: 'Manage appointments and meetings',
    url: 'https://calendar.google.com',
    icon: Calendar,
    color: 'blue',
    tags: ['Schedule', 'Meetings'],
  },
  {
    id: 'document-management',
    name: 'Document Management System',
    description: 'Store and manage documents',
    url: 'https://docs.google.com',
    icon: FolderOpen,
    color: 'cyan',
    tags: ['Documents', 'Storage'],
  },
  {
    id: 'task-management',
    name: 'Task Management System',
    description: 'Track and manage tasks',
    url: 'https://todoist.com',
    icon: List,
    color: 'violet',
    tags: ['Tasks', 'Productivity'],
  },

  // ── Communication Platforms ──────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack Workspace',
    description: 'Team communication and collaboration',
    url: 'https://slack.com',
    icon: MessageSquare,
    color: 'purple',
    tags: ['Chat', 'Collaboration'],
  },
  {
    id: 'zoom',
    name: 'Zoom Meetings',
    description: 'Video conferencing platform',
    url: 'https://zoom.us',
    icon: Video,
    color: 'blue',
    tags: ['Video', 'Meetings'],
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Teams collaboration platform',
    url: 'https://teams.microsoft.com',
    icon: Users,
    color: 'indigo',
    tags: ['Chat', 'Video'],
  },

  // ── Development & IT ─────────────────────────────────────────────────────
 
  {
    id: 'jira',
    name: 'Jira Project Management',
    description: 'Project tracking and agile boards',
    url: 'https://jira.atlassian.com',
    icon: GitBranch,
    color: 'blue',
    tags: ['Projects', 'Agile'],
  },
  {
    id: 'confluence',
    name: 'Confluence Wiki',
    description: 'Documentation and knowledge base',
    url: 'https://confluence.atlassian.com',
    icon: BookOpen,
    color: 'teal',
    tags: ['Docs', 'Wiki'],
  },

  // ── Monitoring & Analytics ──────────────────────────────────────────────
  {
    id: 'analytics',
    name: 'Google Analytics',
    description: 'Website analytics and reporting',
    url: 'https://analytics.google.com',
    icon: BarChart3,
    color: 'orange',
    tags: ['Analytics', 'Reports'],
  },

  // ── AI & Research Tools ──────────────────────────────────────────────────
  {
    id: 'chatgpt',
    name: 'ChatGPT AI Assistant',
    description: 'AI-powered research and writing',
    url: 'https://chat.openai.com',
    icon: Sparkles,
    color: 'green',
    tags: ['AI', 'Research'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI Search',
    description: 'AI-powered search and research',
    url: 'https://perplexity.ai',
    icon: Search,
    color: 'indigo',
    tags: ['AI', 'Search'],
  },

  // ── Social Media ─────────────────────────────────────────────────────────
 
];

// ─── Component ────────────────────────────────────────────────────────────────

const SuperAdminLinks = () => {
  // Group links by category
  const groupedLinks = {
    '⚖️ Judicial & Legal': externalLinks.filter(l => l.tags?.includes('Judicial') || l.tags?.includes('Judgments')),
    '🏛️ Government Systems': externalLinks.filter(l => l.tags?.includes('Government') || l.tags?.includes('Finance')),
    '💼 Productivity & Office': externalLinks.filter(l => l.tags?.includes('Email') || l.tags?.includes('Documents') || l.tags?.includes('Tasks')),
    '💬 Communication': externalLinks.filter(l => l.tags?.includes('Chat') || l.tags?.includes('Video')),
    '👨‍💻 Development & IT': externalLinks.filter(l => l.tags?.includes('Code') || l.tags?.includes('Development')),
    '📊 Analytics & Monitoring': externalLinks.filter(l => l.tags?.includes('Analytics') || l.tags?.includes('Monitor')),
    '🤖 AI & Research': externalLinks.filter(l => l.tags?.includes('AI') || l.tags?.includes('Research')),
    '🌐 Social & Media': externalLinks.filter(l => l.tags?.includes('Social') || l.tags?.includes('Networking')),
  };

  // ── Component that opens external links ──────────────────────────────────
  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ─── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Super Admin Links
                </h1>
                <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2">
                  <Globe2 className="h-4 w-4" />
                  Curated collection of important external links & resources
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {externalLinks.length} total links
            </span>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* ─── Quick Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickStat
            icon={LinkIcon}
            label="Total Links"
            value={externalLinks.length}
            change="All systems"
            color="blue"
          />
          <QuickStat
            icon={Globe}
            label="Categories"
            value={Object.keys(groupedLinks).length}
            change="Organized"
            color="purple"
          />
          <QuickStat
            icon={Star}
            label="Featured Links"
            value="12"
            change="Top picks"
            color="yellow"
          />
        </div>

        {/* ─── Search Bar ───────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search links..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              Search
            </button>
          </div>
        </div>

        {/* ─── Link Categories ────────────────────────────────────────────── */}
        <div className="space-y-6">
          {Object.entries(groupedLinks).map(([category, links]) => (
            links.length > 0 && (
              <CategorySection 
                key={category} 
                title={category} 
                links={links} 
                onOpenLink={handleOpenLink}
              />
            )
          ))}
        </div>

        {/* ─── Quick Actions Bar ───────────────────────────────────────────── */}
        <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Quick Access
          </h3>
          <div className="flex flex-wrap gap-3">
            {externalLinks.slice(0, 8).map((link) => (
              <button
                key={link.id}
                onClick={() => handleOpenLink(link.url)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
              >
                <link.icon className="h-4 w-4" />
                {link.name}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Footer ───────────────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-400 border-t border-gray-200 pt-6 gap-2">
          <div>
            <span className="font-medium text-gray-500">Super Admin Links v1.0</span>
            <span className="mx-2">•</span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              All systems operational
            </span>
            <button className="hover:text-gray-600 transition-colors">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

interface QuickStatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  change: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'teal' | 'yellow' | 'red';
}

const QuickStat = ({ icon: Icon, label, value, change, color }: QuickStatProps) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-green-600">{change}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
};

interface CategorySectionProps {
  title: string;
  links: ExternalLinkItem[];
  onOpenLink: (url: string) => void;
}

const CategorySection = ({ title, links, onOpenLink }: CategorySectionProps) => {
  // Extract emoji from title
  const [emoji, ...titleParts] = title.split(' ');
  const cleanTitle = titleParts.join(' ');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          {cleanTitle}
          <span className="ml-auto text-xs text-gray-400 font-normal bg-gray-100 px-2 py-0.5 rounded-full">
            {links.length} links
          </span>
        </h2>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => onOpenLink(link.url)}
            className="group flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left"
          >
            <div className={`p-2 rounded-lg bg-${link.color}-50 text-${link.color}-600 flex-shrink-0 mt-0.5`}>
              <link.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                  {link.name}
                </p>
                <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{link.description}</p>
              {link.tags && link.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {link.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Missing Icon ────────────────────────────────────────────────────────────
// Need a simple Link icon for the stats
const LinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

// Note: Video icon might need to be imported from lucide-react
// Add: import { Video } from 'lucide-react';

export default SuperAdminLinks;