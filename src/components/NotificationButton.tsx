import { useEffect, useState } from "react";
import { Bell, BellRing, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { app } from "@/lib/firebase";
import {
  enableMaturityNotifications,
  getStoredNotificationToken,
  maturityNotificationsAreEnabled,
} from "@/lib/notifications";

type Status = "idle" | "loading" | "enabled" | "denied" | "unsupported";

const unsupportedNotificationMessage = () => {
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isAppleMobile
    ? "On iPhone or iPad, add this site to the Home Screen and open it there. Web notifications require iOS/iPadOS 16.4 or later."
    : "Open the site in an up-to-date Chrome or Edge browser over HTTPS, outside private/incognito mode.";
};

const NotificationButton = () => {
  const [status, setStatus] = useState<Status>(() =>
    maturityNotificationsAreEnabled() ? "enabled" : "idle"
  );
  const [deviceToken, setDeviceToken] = useState(() => getStoredNotificationToken() ?? "");
  const [showDeviceCode, setShowDeviceCode] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    import("firebase/messaging").then(async ({ getMessaging, onMessage, isSupported }) => {
      const supported = await isSupported();
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
        const previousToken = getStoredNotificationToken();
        enableMaturityNotifications()
          .then((result) => {
            if (result.status === "enabled") {
              setDeviceToken(result.token);
              if (previousToken && result.token !== previousToken) {
                setStatus("idle");
                toast.warning("Device notification code changed", {
                  description: "Open reminders and update the private GitHub secret.",
                });
              }
            }
          })
          .catch((error) => console.error("Notification token refresh error:", error));
      }
    }).catch((error) => {
      console.error("Notification support check failed:", error);
      if (active) setStatus("unsupported");
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const enable = async () => {
    if (status === "enabled" && deviceToken) {
      setShowDeviceCode(true);
      return;
    }

    setStatus("loading");
    try {
      const result = await enableMaturityNotifications();
      setStatus(result.status);

      if (result.status === "enabled") {
        setDeviceToken(result.token);
        setShowDeviceCode(true);
        toast.success("Notification permission enabled", {
          description: "Copy the private device code to GitHub to finish setup.",
        });
      } else if (result.status === "denied") {
        toast.error("Notification permission was blocked", {
          description: "Allow notifications for this site in your browser settings, then try again.",
        });
      } else {
        toast.error("Notifications are not available here", {
          description: unsupportedNotificationMessage(),
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("Notification setup error:", error);
      setStatus("idle");
      toast.error("Could not enable phone reminders", {
        description:
          error instanceof Error
            ? error.message
            : "Check that Firebase Cloud Messaging is configured.",
      });
    }
  };

  const copyDeviceCode = async () => {
    const secretValue = JSON.stringify([deviceToken]);
    try {
      await navigator.clipboard.writeText(secretValue);
      toast.success("Device code copied");
    } catch {
      toast.error("Could not copy automatically. Select and copy the code manually.");
    }
  };

  const isEnabled = status === "enabled";
  const isLoading = status === "loading";

  return (
    <>
      <Button
        variant={isEnabled ? "secondary" : "outline"}
        size="sm"
        onClick={enable}
        disabled={isLoading}
        className="gap-2"
        title={
          status === "unsupported"
            ? "Open for notification setup requirements"
            : isEnabled
              ? "View this device's private notification code"
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
          {isEnabled ? "Device code" : "Enable reminders"}
        </span>
      </Button>

      <Dialog open={showDeviceCode} onOpenChange={setShowDeviceCode}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Finish notification setup</DialogTitle>
            <DialogDescription>
              Copy this private device code into the GitHub Actions secret named
              FCM_DEVICE_TOKENS. Do not post or commit it publicly.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={JSON.stringify([deviceToken])}
            readOnly
            rows={5}
            className="font-mono text-xs break-all"
            aria-label="Private notification device code"
          />
          <p className="text-xs text-muted-foreground">
            For more than one device, keep all codes in one JSON list, for example
            ["first-token", "second-token"].
          </p>
          <DialogFooter>
            <Button onClick={copyDeviceCode} className="gap-2">
              <Copy className="w-4 h-4" /> Copy device code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationButton;
