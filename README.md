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
3. Publish `firestore.rules` from Firebase Console → Firestore Database →
   Rules, or from a signed-in terminal:

   ```sh
   npx firebase-tools deploy --only firestore:rules
   ```

4. In Firebase Console → Project settings → Service accounts, generate a new
   private key. In GitHub → repository Settings → Secrets and variables →
   Actions, create a repository secret named `FIREBASE_SERVICE_ACCOUNT` and
   paste the complete downloaded JSON as its value. Never commit this JSON.
5. Open the deployed app on each device and press **Enable reminders**. On
   iPhone/iPad, first add the site to the Home Screen, open the installed web
   app, and then press the button.
6. In GitHub → Actions → **Send FD maturity reminders**, choose **Run workflow**
   with the test option enabled. The registered devices should receive a test
   notification immediately.

The scheduler runs daily at approximately 9:00 AM in `Asia/Kolkata`. Browsers
can write their own token but cannot read the `notificationSubscriptions`
collection; the GitHub Action uses the private service account to send pushes.
