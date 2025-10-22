import {
  BellIcon,
  CubeIcon,
  DocumentTextIcon,
  LanguageIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SwatchIcon,
} from '@heroicons/react/16/solid';
import SectionErrorBoundary from './components/SectionErrorBoundary';
import ThemeProvider from './components/ThemeProvider';
import { type SectionDefinition, useNavigation } from './hooks/useNavigation';
import ColorsSection from './sections/ColorsSection';
import ComponentsSection from './sections/ComponentsSection';
import IconsSection from './sections/IconsSection';
import NotificationsSection from './sections/NotificationsSection';
import OverviewSection from './sections/OverviewSection';
import SettingsSection from './sections/SettingsSection';
import TypographySection from './sections/TypographySection';

type DesignSection =
  | 'overview'
  | 'colors'
  | 'typography'
  | 'components'
  | 'notifications'
  | 'settings'
  | 'icons';

const sectionDefinitions: SectionDefinition<DesignSection>[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: DocumentTextIcon,
    component: OverviewSection,
  },
  {
    id: 'colors',
    title: 'Colors',
    icon: SwatchIcon,
    component: ColorsSection,
  },
  {
    id: 'typography',
    title: 'Typography',
    icon: LanguageIcon,
    component: TypographySection,
  },
  {
    id: 'components',
    title: 'Components',
    icon: CubeIcon,
    component: ComponentsSection,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: BellIcon,
    component: NotificationsSection,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: ShieldCheckIcon,
    component: SettingsSection,
  },
  {
    id: 'icons',
    title: 'Icons',
    icon: SparklesIcon,
    component: IconsSection,
  },
];

const BrandShowcase = () => {
  const { sections, activeSection, selectSection, CurrentSection } =
    useNavigation(sectionDefinitions, 'overview');

  return (
    <div className="min-h-screen bg-[var(--heroui-background)]">
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
          <nav className="col-span-3">
            <div className="sticky top-4">
              <h3 className="text-xs font-semibold text-[var(--heroui-foreground)] mb-2 opacity-70">
                SECTIONS
              </h3>
              <div className="space-y-0.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`nav-link flex items-center gap-2 ${isActive ? 'active' : ''}`}
                      onClick={() => selectSection(section.id)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {section.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          <main className="col-span-9">
            <SectionErrorBoundary>
              {CurrentSection ? <CurrentSection /> : null}
            </SectionErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <BrandShowcase />
  </ThemeProvider>
);

export default App;
