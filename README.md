# Dad's Financial Hub

## Phone maturity reminders

The app registers Android, iPhone, and desktop browsers with Firebase Cloud
Messaging. A free GitHub Actions job sends a notification:

- one calendar month before an FD matures;
- every Saturday between that date and maturity; and
- on the maturity date.

This design uses the free Firebase Spark plan and free GitHub Actions minutes
for this public repository. Firebase Functions and a Blaze billing account are
not required.

### One-time setup

1. In Firebase Console, enable **Cloud Messaging** for `fd-tracker-58039` and
   create a Web Push certificate under Project settings → Cloud Messaging.
2. Set the certificate's public key as `VITE_FIREBASE_VAPID_KEY` in Vercel and
   redeploy the web app. The Web Push public key is safe to expose.
3. In Firebase Console → Project settings → Service accounts, generate a new
   private key. In GitHub → repository Settings → Secrets and variables →
   Actions, create a repository secret named `FIREBASE_SERVICE_ACCOUNT` and
   paste the complete downloaded JSON as its value. Never commit this JSON.
4. Open the deployed app on each device and press **Enable reminders**. On
   iPhone/iPad, first add the site to the Home Screen. Copy the private device
   code shown by the app.
5. In GitHub Actions secrets, add `FCM_DEVICE_TOKENS`. Paste the copied JSON
   list. For multiple devices, combine the tokens in one list:

   ```json
   ["first-device-token", "second-device-token"]
   ```

6. In GitHub → Actions → **Send FD maturity reminders**, choose **Run workflow**
   with the test option enabled. The registered devices should receive a test
   notification immediately.

The scheduler runs daily at approximately 9:00 AM in `Asia/Kolkata`. Device
tokens and the Firebase service account are stored only in encrypted GitHub
Actions secrets; no public visitor can subscribe to your financial reminders.
# Deposits and insurance policies

The Fixed deposits and Insurance tabs keep the two record types separate. Add and edit forms show a complete review before saving. Back to edit preserves entries; only Confirm and save writes the record. Deleting a record requires a separate confirmation identifying that record. Failed writes keep the form or confirmation open for retry.

Insurance policies are stored in the `insurancePolicies` Firestore collection in the existing Firebase project. Fields include policy number, insurer, holder, name/type, sum assured, premium/frequency, policy dates, next premium date, nominee, and notes. This section tracks policy information; it does not add insurance push notifications to the existing FD reminder scheduler.

Deployment: if Firestore rules restrict access by collection, authorize `insurancePolicies` for the same intended users as deposits. Firestore rules are managed outside this repository and have not been changed by this feature. Do not make the collection publicly writable to resolve a permissions error. The insurance tab reports database access failures instead of presenting them as an empty list.

Verification: `npm test`, `npm run build`, and `npx tsc --noEmit -p tsconfig.app.json`. Tests mock persistence; they do not modify live financial records.
