import {
  ArrowPathIcon,
  BoltIcon,
  CheckIcon,
  ClipboardIcon,
  CubeIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  LanguageIcon,
  MoonIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

// Theme context for dark/light mode
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light',
    );
  }, [isDark]);

  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <button
          type="button"
          className="heroui-button heroui-button-secondary flex items-center gap-2"
          onClick={() => setIsDark(!isDark)}
        >
          {isDark ? (
            <>
              <SunIcon className="w-4 h-4" />
              Light
            </>
          ) : (
            <>
              <MoonIcon className="w-4 h-4" />
              Dark
            </>
          )}
        </button>
      </div>
      {children}
    </div>
  );
};

// Code snippet component with copy functionality
const CodeSnippet = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="absolute top-2 right-2 heroui-button heroui-button-secondary text-xs flex items-center gap-1"
        onClick={copyCode}
      >
        {copied ? (
          <>
            <CheckIcon className="w-3.5 h-3.5" />
            Copied
          </>
        ) : (
          <>
            <ClipboardIcon className="w-3.5 h-3.5" />
            Copy
          </>
        )}
      </button>
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Main Brand Showcase Component
const BrandShowcase = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: DocumentTextIcon },
    { id: 'colors', title: 'Colors', icon: SwatchIcon },
    { id: 'typography', title: 'Typography', icon: LanguageIcon },
    { id: 'components', title: 'Components', icon: CubeIcon },
    { id: 'patterns', title: 'Patterns', icon: EllipsisHorizontalIcon },
    { id: 'states', title: 'States', icon: BoltIcon },
  ];

  return (
    <div className="min-h-screen bg-[var(--heroui-background)]">
      {/* Header */}
      <header className="border-b border-[var(--heroui-content3)] bg-[var(--heroui-content1)]">
        <div className="max-w-6xl mx-auto px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[var(--heroui-foreground)]">
                NewName Design System
              </h1>
              <p className="text-xs text-[var(--heroui-foreground)] opacity-70">
                Invisible, competent, privacy-forward
              </p>
            </div>
            <div className="heroui-chip">Built with HeroUI & Heroicons</div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 py-3">
        <div className="grid grid-cols-12 gap-3">
          {/* Navigation */}
          <nav className="col-span-3">
            <div className="sticky top-4">
              <h3 className="text-xs font-semibold text-[var(--heroui-foreground)] mb-2 opacity-70">
                SECTIONS
              </h3>
              <div className="space-y-0.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`nav-link flex items-center gap-2 ${
                        activeSection === section.id ? 'active' : ''
                      }`}
                      onClick={() => setActiveSection(section.id)}
                      aria-current={
                        activeSection === section.id ? 'page' : undefined
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {section.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Content */}
          <main className="col-span-9">
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'colors' && <ColorsSection />}
            {activeSection === 'typography' && <TypographySection />}
            {activeSection === 'components' && <ComponentsSection />}
            {activeSection === 'patterns' && <PatternsSection />}
            {activeSection === 'states' && <StatesSection />}
          </main>
        </div>
      </div>
    </div>
  );
};

// Overview Section
const OverviewSection = () => (
  <div className="space-y-3">
    <div>
      <h2 className="text-xl font-bold mb-2">Design Principles</h2>
      <p className="text-sm opacity-80 mb-2">
        Our design system is built around the principles of being invisible,
        competent, and privacy-forward.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
          <BoltIcon className="w-4 h-4" />
          Instant Value, Zero Drag
        </h3>
        <p className="text-xs opacity-80">
          The Instant Baseline rename never blocks the download longer than
          necessary.
        </p>
      </div>
      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Upgrade, Don't Nag
        </h3>
        <p className="text-xs opacity-80">
          Contextual Upgrade suggestions appear briefly and are easy to accept,
          ignore, or undo.
        </p>
      </div>
      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <EyeIcon className="w-4 h-4" />
          Trust at a Glance
        </h3>
        <p className="text-xs opacity-80">
          Clear "On-device" vs "Cloud assist" badges with reason tags
          (Title/Date/Geo).
        </p>
      </div>
      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4" />
          Respect Agency
        </h3>
        <p className="text-xs opacity-80">
          Undo everywhere, per-type controls, explicit cloud consent.
        </p>
      </div>
    </div>

    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Voice & Tone</h3>
      <div className="space-y-1.5">
        <div>
          <h4 className="text-xs font-medium mb-1 flex items-center gap-1.5">
            <CheckIcon className="w-3.5 h-3.5" />
            Example Messages:
          </h4>
          <ul className="space-y-1 text-xs opacity-80">
            <li>
              • "Renamed (On-device) to <strong>Application Form…</strong>"
            </li>
            <li>• "Kept original name — already clear."</li>
            <li>
              • "Found better name:{' '}
              <strong>Database — CORS for Edge Functions</strong> • Apply •
              Details"
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

// Colors Section
const ColorsSection = () => {
  const colors = [
    {
      name: 'Primary',
      value: 'var(--heroui-primary)',
      usage: 'Primary actions, active states',
      hex: '#18181B',
    },
    {
      name: 'Secondary',
      value: 'var(--heroui-secondary)',
      usage: 'Secondary text, subtle actions',
      hex: '#71717A',
    },
    {
      name: 'Success',
      value: 'var(--heroui-success)',
      usage: 'Success states, confirmations',
      hex: '#22C55E',
    },
    {
      name: 'Warning',
      value: 'var(--heroui-warning)',
      usage: 'Warnings, cautions',
      hex: '#EAB308',
    },
    {
      name: 'Danger',
      value: 'var(--heroui-danger)',
      usage: 'Errors, destructive actions',
      hex: '#EF4444',
    },
    {
      name: 'Background',
      value: 'var(--heroui-background)',
      usage: 'Page background',
      hex: '#FFFFFF',
    },
    {
      name: 'Content 1',
      value: 'var(--heroui-content1)',
      usage: 'Card surfaces',
      hex: '#FFFFFF',
    },
    {
      name: 'Content 2',
      value: 'var(--heroui-content2)',
      usage: 'Subtle surfaces',
      hex: '#F8F8F8',
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold mb-2">Minimal Color System</h2>
        <p className="text-sm opacity-80 mb-2">
          Professional monochromatic palette with subtle accents for a clean,
          modern aesthetic.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {colors.map((color) => (
          <div key={color.name} className="heroui-card">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-8 h-8 rounded border border-[var(--heroui-content3)]"
                style={{ backgroundColor: color.value }}
              />
              <div>
                <h3 className="text-sm font-semibold">{color.name}</h3>
                <code className="text-xs opacity-70">{color.hex}</code>
              </div>
            </div>
            <p className="text-xs opacity-80">{color.usage}</p>
          </div>
        ))}
      </div>

      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-2">Usage Examples</h3>
        <CodeSnippet
          code={`/* Minimal Professional Color System */
background-color: var(--heroui-primary);       /* #18181B - Near black */
color: var(--heroui-primary-foreground);       /* #FFFFFF */

/* Neutral surfaces */
background-color: var(--heroui-content1);      /* #FFFFFF - Cards */
background-color: var(--heroui-content2);      /* #F8F8F8 - Subtle */
border-color: var(--heroui-content3);          /* #E5E5E5 - Borders */`}
        />
      </div>
    </div>
  );
};

// Typography Section
const TypographySection = () => (
  <div className="space-y-3">
    <div>
      <h2 className="text-xl font-bold mb-2">Typography Scale</h2>
      <p className="text-sm opacity-80 mb-2">
        Clear hierarchy optimized for extension UI constraints.
      </p>
    </div>

    <div className="space-y-2">
      <div className="heroui-card">
        <h1 className="text-lg font-bold mb-1">Heading 1</h1>
        <p className="text-xs opacity-70">
          14px • font-bold • Main page titles
        </p>
      </div>
      <div className="heroui-card">
        <h2 className="text-base font-semibold mb-1">Heading 2</h2>
        <p className="text-xs opacity-70">
          12px • font-semibold • Section headers
        </p>
      </div>
      <div className="heroui-card">
        <h3 className="text-sm font-medium mb-1">Heading 3</h3>
        <p className="text-xs opacity-70">
          11px • font-medium • Subsection headers
        </p>
      </div>
      <div className="heroui-card">
        <p className="text-sm mb-1">Body Text</p>
        <p className="text-xs opacity-70">
          11px • Settings pages, modal content
        </p>
      </div>
      <div className="heroui-card">
        <p className="text-xs mb-1">Small Text</p>
        <p className="text-xs opacity-70">
          10px • Popup interface, secondary info
        </p>
      </div>
    </div>

    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Implementation</h3>
      <CodeSnippet
        code={`/* Extra Compact Typography Classes */
.text-popup { font-size: 11px; font-weight: 400; }    /* Popup interface */
.text-settings { font-size: 12px; font-weight: 400; } /* Settings pages */
.text-caption { font-size: 10px; font-weight: 400; }  /* Helper text */`}
      />
    </div>
  </div>
);

// Components Section (simplified)
const ComponentsSection = () => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold">Component Library</h2>
    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Button Sizes</h3>
      <div className="space-y-2">
        <div>
          <p className="text-xs opacity-70 mb-2">Small (Popup)</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="heroui-button heroui-button-sm heroui-button-primary"
            >
              Apply
            </button>
            <button
              type="button"
              className="heroui-button heroui-button-sm heroui-button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs opacity-70 mb-2">Medium (Default)</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="heroui-button heroui-button-md heroui-button-primary"
            >
              Apply Rename
            </button>
            <button
              type="button"
              className="heroui-button heroui-button-md heroui-button-secondary"
            >
              Keep Original
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs opacity-70 mb-2">Large (Settings)</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="heroui-button heroui-button-lg heroui-button-primary"
            >
              Apply Rename
            </button>
            <button
              type="button"
              className="heroui-button heroui-button-lg heroui-button-secondary"
            >
              Keep Original
            </button>
          </div>
        </div>
      </div>
    </div>

    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Icons (Heroicons)</h3>
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <BoltIcon className="w-4 h-4" />
          <span className="text-sm">Bolt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4" />
          <span className="text-sm">Sparkles</span>
        </div>
        <div className="flex items-center gap-1.5">
          <EyeIcon className="w-4 h-4" />
          <span className="text-sm">Eye</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheckIcon className="w-4 h-4" />
          <span className="text-sm">Shield</span>
        </div>
      </div>
    </div>
  </div>
);

// Patterns Section
const PatternsSection = () => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold">UI Patterns</h2>
    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Upgrade Notification</h3>
      <div className="heroui-toast mb-3">
        <SparklesIcon className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Found better name:</p>
          <p className="text-xs opacity-80">
            <code>Original.pdf</code> →{' '}
            <strong>Database — CORS for Edge Functions</strong>
          </p>
        </div>
      </div>
    </div>
  </div>
);

// States Section
const StatesSection = () => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold">UI States</h2>

    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Success</h3>
      <div className="heroui-toast">
        <CheckIcon className="w-4 h-4 text-[var(--heroui-success)]" />
        <p>
          Applied smarter name: <strong>Document-Title-2024-03-04</strong>
        </p>
      </div>
    </div>

    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Error</h3>
      <div className="heroui-toast">
        <ExclamationTriangleIcon className="w-4 h-4 text-[var(--heroui-danger)]" />
        <p>On-device model not ready — using Metadata-only mode.</p>
      </div>
    </div>
  </div>
);

// Main App
const App = () => {
  return (
    <ThemeProvider>
      <BrandShowcase />
    </ThemeProvider>
  );
};

export default App;
