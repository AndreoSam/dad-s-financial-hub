import { useEffect, useState } from "react";
import { getMessaging, onMessage, isSupported } from "firebase/messaging";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { app } from "@/lib/firebase";
import {
  enableMaturityNotifications,
  maturityNotificationsAreEnabled,
} from "@/lib/notifications";

type Status = "idle" | "loading" | "enabled" | "denied" | "unsupported";

const NotificationButton = () => {
  const [status, setStatus] = useState<Status>(() =>
    maturityNotificationsAreEnabled() ? "enabled" : "idle"
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    isSupported().then((supported) => {
      if (!active) return;
      if (!supported) {
        setStatus("unsupported");
        return;
      }

      unsubscribe = onMessage(getMessaging(app), (payload) => {
        const title = payload.data?.title ?? "FD maturity reminder";
        const body = payload.data?.body ?? "A fixed deposit is approaching maturity.";
        toast.info(title, { description: body, duration: 10000 });
      });

      // Refresh and re-register the token whenever an already-enabled device
      // opens the app, so token rotation does not silently stop reminders.
      if (maturityNotificationsAreEnabled()) {
        enableMaturityNotifications().catch((error) =>
          console.error("Notification token refresh error:", error)
        );
      }
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const enable = async () => {
    setStatus("loading");
    try {
      const result = await enableMaturityNotifications();
      setStatus(result.status);

      if (result.status === "enabled") {
        toast.success("Phone reminders enabled", {
          description: "You will be alerted one month before maturity and every Saturday after that.",
        });
      } else if (result.status === "denied") {
        toast.error("Notification permission was blocked", {
          description: "Allow notifications for this site in your browser settings, then try again.",
        });
      } else {
        toast.error("Notifications are not supported by this browser.");
      }
    } catch (error) {
      console.error("Notification setup error:", error);
      setStatus("idle");
      toast.error("Could not enable phone reminders", {
        description: "Check that Firebase Messaging and the notification function are configured.",
      });
    }
  };

  const isEnabled = status === "enabled";
  const isLoading = status === "loading";

  return (
    <Button
      variant={isEnabled ? "secondary" : "outline"}
      size="sm"
      onClick={enable}
      disabled={isEnabled || isLoading || status === "unsupported"}
      className="gap-2"
      title={
        status === "unsupported"
          ? "Notifications are not supported on this browser"
          : isEnabled
            ? "Maturity reminders are enabled on this device"
            : "Enable maturity reminders on this device"
      }
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isEnabled ? (
        <BellRing className="w-4 h-4" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      <span className="hidden md:inline">
        {isEnabled ? "Reminders on" : "Enable reminders"}
      </span>
    </Button>
  );
};

export default NotificationButton;
