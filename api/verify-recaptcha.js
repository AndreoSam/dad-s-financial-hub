const PROJECT_ID = "fd-tracker-58039";
const SITE_KEY = "6LeuX7wtAAAAAKdORPJVaQsS2NYG62KaqKAMCwQy";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.RECAPTCHA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: "Server reCAPTCHA credential is not configured." });
  }

  const { token, action } = req.body || {};
  if (!token || !action) {
    return res.status(400).json({ ok: false, error: "Missing reCAPTCHA token or action." });
  }

  try {
    const response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: {
            token,
            expectedAction: action,
            siteKey: SITE_KEY,
          },
        }),
      }
    );

    const assessment = await response.json();
    if (!response.ok) {
      console.error("reCAPTCHA assessment error:", assessment);
      return res.status(response.status).json({ ok: false, error: "reCAPTCHA assessment request failed." });
    }

    const valid = assessment?.tokenProperties?.valid === true;
    const actionMatches = assessment?.tokenProperties?.action === action;
    const score = assessment?.riskAnalysis?.score;
    const minimumScore = Number(process.env.RECAPTCHA_MIN_SCORE || "0.5");

    if (!valid || !actionMatches || typeof score !== "number" || score < minimumScore) {
      return res.status(403).json({ ok: false, error: "reCAPTCHA risk check rejected this action." });
    }

    return res.status(200).json({ ok: true, score });
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return res.status(500).json({ ok: false, error: "Unable to verify reCAPTCHA." });
  }
}
