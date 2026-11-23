// ServicePanel: the side panel of one service: its name, code, category, type and attention badges, and the sections of
// lib/panelSections one under the other. It draws whatever the list holds; the host decides which service is shown and keeps the guard.
import { useCallback } from 'react';
import { SidePanel, SidePanelSection, TypeTag } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { ServiceGrants } from '../../hooks/useServiceGrants';
import { useSectionKeys, type PanelSignature } from '../../hooks/useSectionKeys';
import { PANEL_SECTIONS, visibleSections, type PanelSectionSpec } from '../../lib/panelSections';
import { TYPE_LABEL } from '../../lib/status';
import type { Service } from '../../types';
import { AttentionBadges } from '../table/AttentionBadges';
import { BackToList } from './BackToList';
import type { LeaveGate, PanelSectionId } from './types';

export interface ServicePanelProps {
  service: Service;
  grants: ServiceGrants;
  /** The section the address names (`section=`): it scrolls into view and takes focus. */
  section: PanelSectionId | null;
  /** The service's data as text, so a section is mounted again when a save changed it (see `useSectionKeys`). */
  signature: PanelSignature;
  /** The sections that hold unsaved changes: they keep their form when the others are mounted again. */
  dirty: readonly PanelSectionId[];
  /** A section says whether it holds unsaved changes. */
  onDirtyChange: (service: Id, section: PanelSectionId, dirty: boolean) => void;
  /** A badge names a part of this service: the address moves to it. */
  onSection: (section: PanelSectionId) => void;
  /** The close button, Escape and "Back to the list". The host asks first when a section is dirty. */
  onClose: () => void;
  /** Asks first when a section is dirty, before a link of a section leaves the panel. Without it the links just go. */
  onLeave?: LeaveGate;
  /** The sections to draw; the page's list by default. */
  sections?: readonly PanelSectionSpec[];
}

type SlotProps = {
  spec: PanelSectionSpec;
  service: Service;
  grants: ServiceGrants;
  active: boolean;
  sectionKey: string;
  onDirtyChange: ServicePanelProps['onDirtyChange'];
  onLeave?: LeaveGate;
};

// One section: its heading and hairline from the kit, and its component, which reports its own unsaved state. The kit mounts the
// component again when `sectionKey` changes, and moves focus to the heading if it was inside.
function SectionSlot({ spec, service, grants, active, sectionKey, onDirtyChange, onLeave }: SlotProps) {
  const report = useCallback(
    (dirty: boolean) => onDirtyChange(service.id, spec.id, dirty),
    [onDirtyChange, service.id, spec.id],
  );
  return (
    <SidePanelSection
      id={`service-panel-${spec.id}`}
      title={spec.title}
      active={active}
      contentKey={sectionKey}
    >
      <spec.Component
        service={service}
        grants={grants}
        active={active}
        onDirtyChange={report}
        onLeave={onLeave}
      />
    </SidePanelSection>
  );
}

/**
 * The panel of one service. Mount it with `key={service.id}`, so focus moves to its heading for each service and a section never
 * keeps the form of the one before. Each section gets a key made of the service and a version. The version rises after a save, for
 * the sections that hold a snapshot of the service in a form (`remountOnChange`) and only while they are clean.
 */
export function ServicePanel({
  service,
  grants,
  section,
  signature,
  dirty,
  onDirtyChange,
  onSection,
  onClose,
  onLeave,
  sections = PANEL_SECTIONS,
}: ServicePanelProps) {
  const shown = visibleSections(grants, sections);
  const remountable = shown.filter((spec) => spec.remountOnChange).map((spec) => spec.id);
  const keyOf = useSectionKeys(service.id, signature, dirty, remountable);

  return (
    <SidePanel
      title={service.name}
      sub={
        <>
          <span className="mono">{service.code}</span>
          {service.category && ` · ${service.category.name}`}
        </>
      }
      badges={
        <>
          <TypeTag>{TYPE_LABEL[service.type]}</TypeTag>
          <AttentionBadges service={service} onOpen={(_service, part) => onSection(part)} />
        </>
      }
      onClose={onClose}
      closeLabel="Close service"
    >
      <BackToList onBack={onClose} />
      {shown.length === 0 ? (
        <p className="text-sm text-ink3">Nothing to show for your role.</p>
      ) : (
        shown.map((spec) => (
          <SectionSlot
            key={spec.id}
            spec={spec}
            service={service}
            grants={grants}
            active={section === spec.id}
            sectionKey={keyOf(spec.id)}
            onDirtyChange={onDirtyChange}
            onLeave={onLeave}
          />
        ))
      )}
    </SidePanel>
  );
}
