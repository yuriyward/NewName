import type { ComponentType, SVGProps } from 'react';
import { useCallback, useMemo, useState } from 'react';

export interface SectionDefinition<TSection extends string = string> {
  id: TSection;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  component: ComponentType;
}

export interface UseNavigationResult<TSection extends string> {
  sections: SectionDefinition<TSection>[];
  activeSection: TSection;
  selectSection: (sectionId: TSection) => void;
  CurrentSection: ComponentType | null;
}

export const useNavigation = <TSection extends string>(
  sectionDefinitions: SectionDefinition<TSection>[],
  initialSection?: TSection,
): UseNavigationResult<TSection> => {
  if (sectionDefinitions.length === 0) {
    throw new Error('useNavigation requires at least one section definition');
  }

  const defaultSection = initialSection ?? sectionDefinitions[0].id;
  const [activeSection, setActiveSection] = useState<TSection>(defaultSection);

  const sections = useMemo(() => sectionDefinitions, [sectionDefinitions]);

  const CurrentSection = useMemo(() => {
    const active = sections.find((section) => section.id === activeSection);
    return active?.component ?? null;
  }, [sections, activeSection]);

  const selectSection = useCallback((sectionId: TSection) => {
    setActiveSection(sectionId);
  }, []);

  return {
    sections,
    activeSection,
    selectSection,
    CurrentSection,
  };
};
