# Dad's Financial Hub

## Phone maturity reminders

The app can register Android, iPhone, and desktop browsers for Firebase Cloud
Messaging reminders. It sends a notification:

- one calendar month before an FD matures;
- every Saturday between that date and maturity; and
- on the maturity date.

### Firebase setup

1. In Firebase Console, enable **Cloud Messaging** for `fd-tracker-58039` and
   create a Web Push certificate under Project settings → Cloud Messaging.
2. Set the certificate's public key as `VITE_FIREBASE_VAPID_KEY` in the web
   app's build environment. Never put the private key in this repository.
3. From the repository root, install and deploy the scheduled backend:

   ```sh
   npm --prefix functions install
   npx firebase-tools deploy --only functions
   ```

   Scheduled functions require the Firebase project to use the Blaze plan.
4. Deploy the web app over HTTPS. Open it on each phone and press **Enable
   reminders**. On iPhone/iPad, first add the site to the Home Screen, open the
   installed web app, and then press the button.

The scheduler runs daily at 9:00 AM in `Asia/Kolkata`. Token registration goes
through a callable function, so browser clients never need read access to the
`notificationSubscriptions` collection.
