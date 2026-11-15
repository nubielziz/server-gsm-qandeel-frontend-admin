// The desktop notification for a new customer message (feature 28, rule 5), shown only while the tab is hidden and only when the staff member allowed it. It names the
// ticket and the requester and never carries the message text, so nothing private is on the lock screen.

export interface DesktopAlert {
  title: string;
  body: string;
  /** Alerts with the same tag replace each other, so one busy ticket shows one notification. */
  tag: string;
  /** Called when the staff member clicks the notification (the window is focused first). */
  onOpen: () => void;
}

/** True when this browser has desktop notifications at all. */
export function desktopAlertsSupported(): boolean {
  return typeof Notification !== 'undefined';
}

/** Shows the notification when the browser has been allowed to. Answers whether it was shown. */
export function showDesktopAlert({ title, body, tag, onOpen }: DesktopAlert): boolean {
  if (!desktopAlertsSupported() || Notification.permission !== 'granted') return false;
  try {
    const notification = new Notification(title, { body, tag });
    notification.onclick = () => {
      window.focus();
      onOpen();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
