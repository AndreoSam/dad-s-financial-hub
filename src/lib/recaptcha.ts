export const RECAPTCHA_SITE_KEY = "6LeuX7wtAAAAAKdORPJVaQsS2NYG62KaqKAMCwQy";

declare global {
  interface Window {
    grecaptcha?: {
      enterprise: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

export const getRecaptchaToken = (action: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha?.enterprise) {
      reject(new Error("reCAPTCHA Enterprise has not loaded."));
      return;
    }

    grecaptcha.enterprise.ready(async () => {
      try {
        const token = await grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });

export const verifyRecaptcha = async (action: string) => {
  const token = await getRecaptchaToken(action);
  const response = await fetch("/api/verify-recaptcha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error || "reCAPTCHA verification failed.");
  }
  return result;
};
