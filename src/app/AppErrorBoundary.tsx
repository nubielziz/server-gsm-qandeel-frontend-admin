// AppErrorBoundary: shows an error state instead of a blank screen when a page throws while rendering.
// Ports the try/catch around r.render() in render() of 90-app.js ("This page failed to render", request "client").
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState, Panel } from '@/components/ui';

type Props = {
  children: ReactNode;
  /** When this value changes (the path, for the shell) a shown error is cleared and the children render again. */
  resetKey?: unknown;
  /** Centre the error on its own, for the outermost boundary that has no page frame around it. */
  fullPage?: boolean;
};

type State = { error: Error | null };

/**
 * The shell wraps the routed page in one so a broken page leaves the sidebar usable, and the app root has one more
 * for failures outside any page. Retry renders the children again; a new `resetKey` does the same.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(previous: Props): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const content = (
      <Panel flush>
        <ErrorState
          title="This page failed to render"
          detail={error.message}
          requestId="client"
          onRetry={() => this.setState({ error: null })}
        />
      </Panel>
    );
    return this.props.fullPage ? <div className="mx-auto max-w-[560px] p-6">{content}</div> : content;
  }
}
