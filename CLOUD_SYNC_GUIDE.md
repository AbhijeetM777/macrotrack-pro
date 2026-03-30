# MacroTrack Pro - Cloud Sync Implementation Guide

Complete guide to implementing cross-device synchronization with Supabase backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Device                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  index.html (PWA)                                        │  │
│  │  ├── lib/storage.js (localStorage)                       │  │
│  │  ├── lib/sync.js (Supabase client)                      │  │
│  │  └── Components (UI/UX)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                      │               │
│           │ (offline) localStorage             │ (online) API   │
│           ▼                                      ▼               │
│  ┌──────────────────────┐        ┌──────────────────────┐      │
│  │  Sync Queue          │        │  Supabase Client     │      │
│  │  (offline-first)     │        │  (JWT auth)          │      │
│  └──────────────────────┘        └──────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Cloud                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                     │  │
│  │  ├── profiles                                            │  │
│  │  ├── food_logs                                           │  │
│  │  ├── weight_entries                                      │  │
│  │  ├── fasting_sessions                                    │  │
│  │  ├── activity_logs                                       │  │
│  │  └── sync_logs                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication (Supabase Auth)                          │  │
│  │  ├── User registration/login                             │  │
│  │  ├── JWT tokens                                          │  │
│  │  └── Session management                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Storage (optional - for food photos)                    │  │
│  │  └── food-photos bucket                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 4: Cloud Sync Implementation Timeline (20-24 hours)

### Week 1: Setup & Authentication (6 hours)
- [ ] Create Supabase project
- [ ] Run database schema migrations (SUPABASE_SCHEMA.md)
- [ ] Implement auth UI (signup/login modals)
- [ ] Create auth module
- [ ] Test user registration flow

### Week 2: Data Sync (8 hours)
- [ ] Implement food log sync
- [ ] Implement weight entry sync
- [ ] Add conflict resolution (last-write-wins)
- [ ] Create offline queue system
- [ ] Test sync with simulated offline

### Week 3: Integration & Optimization (6 hours)
- [ ] Integrate sync module into main app
- [ ] Add sync status indicators
- [ ] Implement auto-sync on interval
- [ ] Add error recovery
- [ ] Performance testing

### Week 4: Testing & Deployment (4 hours)
- [ ] Full E2E testing
- [ ] Multi-device sync testing
- [ ] Load testing
- [ ] Deploy to production
- [ ] Monitor sync logs

## Offline-First Architecture

MacroTrack Pro uses an **offline-first** approach:

1. **All operations start locally** (localStorage)
2. **Changes queued for sync** when online
3. **Sync happens in background** (doesn't block UI)
4. **Conflict resolution** using timestamps (last-write-wins)
5. **Graceful fallback** to local-only if sync fails

### Sync Flow Diagram

```
User Action (e.g., Log Food)
    │
    ▼
LocalStorage Updated ✅
(UI immediately reflects change)
    │
    ▼
Change Queued for Sync
    │
    ├─── If Online ──→ Attempt Cloud Sync
    │                  ├─→ Success ✅ (remove from queue)
    │                  └─→ Failure ⚠️ (retry next interval)
    │
    └─── If Offline → Wait for Connection
         (keeps working locally, syncs when online)
```

## Implementation Steps

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `@supabase/supabase-js` - Supabase client
- `vitest` - Test runner
- `@testing-library/dom` - DOM testing
- Other dev dependencies

### 2. Setup Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project (free tier available)
3. Save Project URL and Anon Key
4. Set environment variables:

```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Run Database Migrations

In Supabase SQL editor, run all queries from `SUPABASE_SCHEMA.md`:

```sql
-- 1. Create tables (profiles, food_logs, weight_entries, etc.)
-- 2. Enable RLS on all tables
-- 3. Create triggers for timestamps
-- 4. Create indexes for performance
```

### 4. Update App Configuration

```javascript
// In main app initialization
import { SyncModule } from './lib/sync.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize sync module
await SyncModule.initialize(SUPABASE_URL, SUPABASE_KEY);

// Enable auto-sync every 5 minutes
const cleanup = SyncModule.enableAutoSync(5 * 60 * 1000);
```

### 5. Add Auth UI

```html
<!-- Login Modal -->
<div id="auth-modal" class="modal">
  <div class="modal-content">
    <h2>Sign In to MacroTrack</h2>
    <input id="auth-email" type="email" placeholder="Email">
    <input id="auth-password" type="password" placeholder="Password">
    <button onclick="handleSignIn()">Sign In</button>
    <button onclick="handleSignUp()">Create Account</button>
  </div>
</div>
```

```javascript
// Auth event handlers
async function handleSignIn() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  const result = await SyncModule.signIn({ email, password });

  if (result.success) {
    showToast('✅ Signed in!');
    // Trigger full sync
    await SyncModule.fullSync();
  } else {
    showToast('❌ ' + result.error);
  }
}

async function handleSignUp() {
  // Similar to sign in but with additional profile fields
}
```

### 6. Add Sync Queue Management

```javascript
// Auto-queue changes
function logFood(entry) {
  // Save to localStorage first (offline support)
  const log = StorageModule.getTodayLog();
  log.push(entry);
  StorageModule.saveTodayLog(log);

  // Queue for cloud sync
  if (SyncModule.isAuthenticated()) {
    SyncModule.queueChange({
      type: 'food_log_added',
      data: entry,
      date: StorageModule.getKey()
    });
  }
}
```

### 7. Add Sync Status Indicator

```html
<!-- Sync status badge -->
<div id="sync-status" class="badge">
  <span id="sync-text">Synced</span>
  <span id="sync-icon">✅</span>
</div>
```

```javascript
// Update sync status
async function updateSyncStatus() {
  const isAuth = SyncModule.isAuthenticated();
  const lastSync = SyncModule.getLastSyncTime();
  const queueLength = SyncModule.getSyncQueue().length;

  const statusEl = document.getElementById('sync-status');
  const textEl = document.getElementById('sync-text');
  const iconEl = document.getElementById('sync-icon');

  if (!isAuth) {
    textEl.textContent = 'Offline';
    iconEl.textContent = '⛔';
    statusEl.classList.add('offline');
  } else if (queueLength > 0) {
    textEl.textContent = `Syncing (${queueLength})`;
    iconEl.textContent = '⏳';
    statusEl.classList.add('syncing');
  } else {
    textEl.textContent = 'Synced';
    iconEl.textContent = '✅';
    statusEl.classList.add('synced');
  }
}

// Update every 30 seconds
setInterval(updateSyncStatus, 30000);
```

## Conflict Resolution Strategy

**Last-Write-Wins (LWW)**: When the same data exists in both local and cloud, the version with the latest timestamp wins.

```javascript
function resolveConflict(local, remote) {
  const localTime = new Date(local.updated_at || 0).getTime();
  const remoteTime = new Date(remote.updated_at || 0).getTime();

  return remoteTime > localTime ? remote : local;
}
```

### Example Scenarios

**Scenario 1**: User logs food offline, then online from different device
```
Device A (offline):
- Logs "Chicken" at 10:00 AM (local time)

Device B (online):
- Logs "Rice" at 10:05 AM (synced immediately)

When Device A comes online:
- Cloud has "Rice" (newer timestamp)
- Conflict resolved: LWW keeps "Rice"
- User sees both after Device A pulls latest
```

**Scenario 2**: User edits same weight from two devices
```
Device A: Logs weight 80 kg at 8:00 AM
Device B: Edits to 80.5 kg at 8:05 AM

Sync Result: 80.5 kg (Device B timestamp is newer)
```

## Testing Cloud Sync

### Unit Tests (provided in tests/)

```bash
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report
npm run test:watch         # Watch mode
```

### Manual Testing Checklist

- [ ] **Offline Mode**: Disable WiFi, log food, enable WiFi, verify sync
- [ ] **Multi-Device**: Log on Device A, check Device B receives data
- [ ] **Conflict**: Edit same data on two devices, verify LWW resolution
- [ ] **Queue**: Simulate flaky network, verify queue persists
- [ ] **Cleanup**: Verify sync queue empties after successful sync
- [ ] **Error Handling**: Simulate failed requests, verify graceful fallback

### E2E Test Example

```javascript
describe('Cloud Sync', () => {
  it('should sync food log across devices', async () => {
    // 1. Sign in
    await SyncModule.signIn({ email: 'test@example.com', password: 'password' });

    // 2. Log food
    const entry = { name: 'Chicken', kcal: 300 };
    StorageModule.getTodayLog().push(entry);

    // 3. Sync
    const result = await SyncModule.fullSync();
    expect(result.success).toBe(true);
    expect(result.stats.logs).toBeGreaterThan(0);

    // 4. Verify cloud has data
    const cloudData = await SyncModule.pullLatestData();
    expect(cloudData.data.logs[0].entries).toContainEqual(entry);
  });
});
```

## Monitoring and Analytics

### Sync Logs Table

All sync operations are logged in the `sync_logs` table:

```sql
SELECT
  operation,
  status,
  items_synced,
  duration_ms,
  error_message,
  completed_at
FROM sync_logs
WHERE user_id = $1
ORDER BY started_at DESC
LIMIT 20;
```

### Dashboard Metrics

- Success rate: `(completed / total) * 100`
- Average sync time: `AVG(duration_ms)`
- Error frequency: `COUNT(*) WHERE status = 'failed'`
- Items synced: `SUM(items_synced)`

## Security Best Practices

1. **Never expose service role key** (only in backend)
2. **Keep anon key secret** (environment variable)
3. **Always use HTTPS** (default in Supabase)
4. **Validate all inputs** before sync
5. **Use prepared statements** (Supabase handles this)
6. **Enable RLS** on all tables (done in schema)
7. **Rotate secrets regularly** in production
8. **Monitor access logs** for suspicious activity

## Troubleshooting

### Sync fails with "Unauthorized"
- Check JWT token is valid
- Verify user is authenticated
- Check RLS policies on tables

### Data not syncing
- Check internet connection
- Verify Supabase URL and key in .env
- Check sync queue not full
- Review sync_logs table for errors

### Duplicate data after sync
- Verify UNIQUE constraints on tables
- Check conflict resolution logic
- Review sync queue handling

### Slow sync performance
- Check network speed
- Verify database indexes exist
- Consider batching large datasets
- Profile with browser DevTools

## Production Deployment Checklist

- [ ] Supabase project in production tier
- [ ] Database backups enabled
- [ ] SSL certificates configured
- [ ] Rate limiting configured
- [ ] Monitoring and alerts set up
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Load testing completed
- [ ] Multi-device testing passed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Team trained on deployment
- [ ] Rollback plan documented

## Next Steps

1. **Complete Phase 4**: Implement cloud sync
2. **Phase 5**: Advanced features (meal planning, social, AI recommendations)
3. **Monitor**: Track sync metrics and user adoption
4. **Iterate**: Gather feedback and improve UX
5. **Scale**: Optimize for millions of users

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/guides/cli)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Offline-First Architecture](https://offlinefirst.org/)
- [Conflict Resolution Strategies](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)

---

**Last Updated**: March 31, 2026
**Version**: 1.0
**Status**: Ready for Phase 4 Implementation
