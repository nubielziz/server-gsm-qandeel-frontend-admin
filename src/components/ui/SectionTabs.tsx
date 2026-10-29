// SectionTabs: the tab strip used inside a panel, with side padding. Ports sectionTabs() of 13-b2c-ui.js.
import { cx } from './cx';
import { Tabs, type TabsProps } from './Tabs';

export function SectionTabs<V extends string = string>({ className, ...rest }: TabsProps<V>) {
  return <Tabs {...rest} className={cx('px-2', className)} />;
}
