// PartBoundary: keeps one part of the System health page (the verdict, the key figures, a tab) from taking the whole page
// down when it cannot be drawn. The answers are an assumed contract, so a shape the console does not expect must show a
// neutral note in that one place, not a blank screen. No demo page.
import { Component, type ReactNode } from 'react';
import { EmptyState, Panel } from '@/components/ui';

export interface PartBoundaryProps {
  /** What the part is, for the note ("The verdict"). */
  name: string;
  /** When this value changes the part is tried again, for example the time of the latest answer. */
  resetKey?: unknown;
  /** What to draw instead of the note, for a part that is better missing than explained (a hidden announcer). */
  fallback?: ReactNode;
  children: ReactNode;
}

interface PartBoundaryState {
  failed: boolean;
}

/**
 * An error boundary has to be a class. It catches what its children throw while rendering, shows the note (or `fallback`)
 * and tries again when `resetKey` changes, so the next good answer brings the part back without a reload.
 */
export class PartBoundary extends Component<PartBoundaryProps, PartBoundaryState> {
  state: PartBoundaryState = { failed: false };

  static getDerivedStateFromError(): PartBoundaryState {
    return { failed: true };
  }

  componentDidUpdate(previous: PartBoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <Panel className="mb-4">
        <EmptyState icon="info" title={`${this.props.name} cannot be shown`}>
          Something in the answer, or in the page itself, could not be drawn. It tries again with the next
          update. If this stays, reload the page or tell the developers.
        </EmptyState>
      </Panel>
    );
  }
}
