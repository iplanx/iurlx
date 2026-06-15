# iurl.me Link Manager (iurlx)

A modern, high-performance monorepo for managing dynamic shortened URL redirects with a premium React management dashboard, integrated Firebase Cloud Functions, and optimized Firestore security controls.

---

## Workspace Structure

The project is organized as a Yarn Monorepo containing the following components:

- **[`app/`](./app)**: The React client application built with TypeScript, featuring a Glassmorphic links table dashboard, instant hover tooltips, and real-time link editing/slug-availability checking.
- **[`functions/`](./functions)**: The optimized TypeScript Cloud Functions backend handling high-speed, lock-free redirection traffic.
- **Root Configurations**:
  - `firebase.json`: Configuration mapping emulator ports and multi-site hosting configurations (`iurlx-staging` & `ilinkx`).
  - `firestore.rules`: Advanced security rules restricting slug harvests while keeping get checks public.

---

## Local Development & Emulators

To run the application locally with full Firestore, Auth, Functions, and Hosting emulators:

```bash
# Install all dependencies across workspaces
yarn install

# Spin up the local Firebase Emulator Suite and the React dev server
yarn emulator
```

*Note: The emulator runs with `--export-on-exit` and `--import=.firebase-local` enabling persistent databases between restarts. Stop the process gracefully using **Ctrl+C** or **SIGINT** (`kill -2`) to save modifications.*

---

## Multi-Environment Configuration

Environment detection is powered by `process.env.REACT_APP_ENVIRONMENT` matching the target project configuration:

- **`STAGING`**: Targets the `iplanx-staging` project.
- **`PROD`**: Targets the `iplanx-bb47f` (Production) project.
- **`DEV`**: Falls back to local emulators for safe offline development.

---

## Deployment Instructions

### Option 1: Automated Git Deployment (Recommended)

GitHub Actions are configured to automatically build and deploy the correct environment assets based on branches:

- **Deploy to Staging (`iplanx-staging` / `iurlx-staging`)**:
  Push or merge your changes to the `staging` branch.
- **Deploy to Production (`iplanx-bb47f` / `ilinkx`)**:
  Push or merge your changes to the `prod` branch.

---

### Option 2: Manual Deployment from Local Terminal

If you need to deploy directly from your machine using the Firebase CLI:

#### 1. Sync Firestore Indexes (Optional/Recommended)

Before deployment, you can pull the latest Firestore indexes from the active database to ensure your local config file is in sync:
```bash
firebase firestore:indexes > firestore.indexes.json
```

#### 2. Deploying to Staging (`iplanx-staging`)

1. **Select target environment**:
   ```bash
   firebase use iplanx-staging
   ```
2. **Build frontend with Staging variables**:
   ```bash
   yarn build:staging
   ```
3. **Deploy backend and hosting target**:
   ```bash
   firebase deploy --only functions,firestore,hosting:iurlx-staging
   ```

#### 3. Deploying to Production (`iplanx-bb47f`)

1. **Select target environment**:
   ```bash
   firebase use iplanx-bb47f
   ```
2. **Build frontend with Production variables**:
   ```bash
   yarn build:prod
   ```
3. **Deploy backend and hosting target**:
   ```bash
   firebase deploy --only functions,firestore,hosting:ilinkx
   ```
