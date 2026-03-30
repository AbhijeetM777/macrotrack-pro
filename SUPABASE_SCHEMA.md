# Supabase Database Schema for MacroTrack Pro

Complete schema definition for cloud synchronization and user data persistence.

## Database Setup

### Prerequisites
- Supabase account (free tier available)
- PostgreSQL 13+
- Project URL and anon key

### Environment Variables
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## Tables

### 1. **profiles** - User Profile Information

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
  weight DECIMAL(5,2) NOT NULL CHECK (weight >= 30 AND weight <= 300),
  height INTEGER NOT NULL CHECK (height >= 100 AND height <= 250),
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  activity VARCHAR(20) NOT NULL CHECK (activity IN ('sedentary', 'light', 'moderate', 'active', 'veryActive')),
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('cut', 'maintain', 'bulk')),
  diet_ratio INTEGER[] NOT NULL DEFAULT ARRAY[30, 40, 30],
  diet_name VARCHAR(50),

  -- Derived targets (cached for performance)
  daily_calories INTEGER,
  daily_protein INTEGER,
  daily_carbs INTEGER,
  daily_fat INTEGER,
  tdee INTEGER,

  -- Preferences
  theme VARCHAR(10) DEFAULT 'dark',
  reminders_enabled BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,

  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

### 2. **food_logs** - Daily Food Entries

```sql
CREATE TABLE food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,

  -- Entries are stored as JSONB for flexibility
  entries JSONB NOT NULL DEFAULT '[]',
  -- Format: [{id, name, kcal, protein, carbs, fat, fiber, sugar, sodium, meal, emoji}, ...]

  -- Daily totals (denormalized for faster queries)
  total_kcal INTEGER DEFAULT 0,
  total_protein DECIMAL(8,2) DEFAULT 0,
  total_carbs DECIMAL(8,2) DEFAULT 0,
  total_fat DECIMAL(8,2) DEFAULT 0,
  total_fiber DECIMAL(8,2) DEFAULT 0,
  total_sugar DECIMAL(8,2) DEFAULT 0,
  total_sodium INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,

  UNIQUE(user_id, log_date)
);

-- Enable RLS
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food logs"
  ON food_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs"
  ON food_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs"
  ON food_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, log_date DESC);
```

### 3. **weight_entries** - Weight Tracking

```sql
CREATE TABLE weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,

  weight_kg DECIMAL(5,2) NOT NULL CHECK (weight_kg >= 30 AND weight_kg <= 300),
  bmi DECIMAL(4,1),

  -- Optional measurements
  waist_cm INTEGER,
  chest_cm INTEGER,
  arms_cm INTEGER,

  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,

  UNIQUE(user_id, entry_date)
);

-- Enable RLS
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weights"
  ON weight_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own weights"
  ON weight_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weights"
  ON weight_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_weight_entries_user_date ON weight_entries(user_id, entry_date DESC);
```

### 4. **fasting_sessions** - Intermittent Fasting Tracking

```sql
CREATE TABLE fasting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  protocol VARCHAR(20) NOT NULL CHECK (protocol IN ('16:8', '18:6', '20:4', 'OMAD')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_hours DECIMAL(4,1),

  -- Status
  status VARCHAR(20) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'broken')),

  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE fasting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fasting"
  ON fasting_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own fasting"
  ON fasting_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for queries
CREATE INDEX idx_fasting_user_date ON fasting_sessions(user_id, created_at DESC);
```

### 5. **activity_logs** - Steps and Workouts

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,

  steps INTEGER DEFAULT 0 CHECK (steps >= 0),
  calories_burned INTEGER DEFAULT 0,

  -- Activity breakdown
  activities JSONB NOT NULL DEFAULT '[]',
  -- Format: [{name, steps, calories}, ...]

  active_minutes INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,

  UNIQUE(user_id, log_date)
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
  ON activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own activities"
  ON activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_activity_logs_user_date ON activity_logs(user_id, log_date DESC);
```

### 6. **sync_logs** - Track Sync Operations

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  operation VARCHAR(50) NOT NULL, -- 'full_sync', 'food_sync', 'weight_sync'
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),

  items_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  details JSONB,
  error_message TEXT,

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  duration_ms INTEGER
);

-- Enable RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON sync_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_sync_logs_user ON sync_logs(user_id, started_at DESC);
```

---

## Triggers and Functions

### Auto-update `updated_at` Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_logs_updated_at
  BEFORE UPDATE ON food_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weight_entries_updated_at
  BEFORE UPDATE ON weight_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fasting_sessions_updated_at
  BEFORE UPDATE ON fasting_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_logs_updated_at
  BEFORE UPDATE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Auto-calculate Denormalized Totals

```sql
CREATE OR REPLACE FUNCTION recalculate_food_log_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate totals from entries JSONB array
  NEW.total_kcal = (
    SELECT COALESCE(SUM((entry->>'kcal')::INTEGER), 0)
    FROM jsonb_array_elements(NEW.entries) AS entry
  );
  NEW.total_protein = (
    SELECT COALESCE(SUM((entry->>'protein')::DECIMAL), 0)
    FROM jsonb_array_elements(NEW.entries) AS entry
  );
  -- ... similar for carbs, fat, fiber, sugar, sodium
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalc_food_log_totals
  BEFORE INSERT OR UPDATE ON food_logs
  FOR EACH ROW EXECUTE FUNCTION recalculate_food_log_totals();
```

---

## Storage Buckets

### Food Photos

```sql
-- Create bucket for user food photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-photos', 'food-photos', true);

-- Set storage policy
CREATE POLICY "Users can upload their own food photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'food-photos' AND auth.uid()::text = owner);

CREATE POLICY "Public read access for food photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'food-photos');
```

---

## Queries and Views

### User's Last 30 Days Summary

```sql
CREATE OR REPLACE VIEW user_30day_summary AS
SELECT
  user_id,
  COUNT(DISTINCT log_date) as days_logged,
  AVG(total_kcal) as avg_daily_kcal,
  AVG(total_protein) as avg_daily_protein,
  MIN(total_kcal) as min_kcal_day,
  MAX(total_kcal) as max_kcal_day,
  SUM(total_kcal) as total_kcal_30d
FROM food_logs
WHERE log_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id;
```

### Weight Progress View

```sql
CREATE OR REPLACE VIEW weight_progress AS
SELECT
  user_id,
  entry_date,
  weight_kg,
  LAG(weight_kg) OVER (PARTITION BY user_id ORDER BY entry_date) as prev_weight,
  weight_kg - LAG(weight_kg) OVER (PARTITION BY user_id ORDER BY entry_date) as daily_change,
  SUM(weight_kg - LAG(weight_kg) OVER (PARTITION BY user_id ORDER BY entry_date))
    OVER (PARTITION BY user_id ORDER BY entry_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as week_change
FROM weight_entries
ORDER BY user_id, entry_date DESC;
```

---

## Migration from localStorage

### Data Import Script

```javascript
// Run this in browser console after user logs in
async function migrateLocalStorage() {
  const userId = localStorage.getItem('mt_user_id');
  const profile = JSON.parse(localStorage.getItem('mt_profile'));
  const logs = [];

  // Collect all food logs
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('mt_log_')) {
      const date = key.replace('mt_log_', '');
      const entries = JSON.parse(localStorage.getItem(key));
      logs.push({ date, entries });
    }
  }

  // Upload to Supabase
  for (const log of logs) {
    await supabase.from('food_logs').insert({
      user_id: userId,
      log_date: log.date,
      entries: log.entries
    });
  }

  console.log('✅ Migration complete!');
}
```

---

## Backup and Recovery

### Export All User Data

```sql
-- SQL query to export user's complete data
SELECT
  p.id,
  p.name,
  p.email,
  json_build_object(
    'profile', row_to_json(p),
    'food_logs', (
      SELECT json_agg(row_to_json(f))
      FROM food_logs f
      WHERE f.user_id = p.id
    ),
    'weights', (
      SELECT json_agg(row_to_json(w))
      FROM weight_entries w
      WHERE w.user_id = p.id
    ),
    'fasting', (
      SELECT json_agg(row_to_json(fs))
      FROM fasting_sessions fs
      WHERE fs.user_id = p.id
    )
  ) as complete_data
FROM profiles p
WHERE p.id = $1;
```

---

## Performance Optimization

### Recommended Indexes

```sql
-- Queries by date range
CREATE INDEX idx_food_logs_user_date_range ON food_logs(user_id, log_date DESC);
CREATE INDEX idx_weight_entries_user_date_range ON weight_entries(user_id, entry_date DESC);

-- Searches
CREATE INDEX idx_food_logs_created ON food_logs(created_at DESC);

-- Sync operations
CREATE INDEX idx_food_logs_synced ON food_logs(synced_at) WHERE synced_at IS NULL;
```

### Connection Pooling

```javascript
// Use connection pooling in production
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    global: {
      headers: { 'x-application-name': 'macrotrack-pro' }
    }
  }
);
```

---

## Security Considerations

1. **Row Level Security (RLS)**: All tables have RLS enabled
2. **Data Encryption**: Use SSL/TLS for all connections (default in Supabase)
3. **Authentication**: Supabase Auth handles password hashing
4. **API Keys**: Keep anon key safe, use service role key only in backend
5. **Validation**: Database constraints enforce data integrity
6. **Audit Trail**: sync_logs table tracks all modifications

---

## Deployment Checklist

- [ ] Create Supabase project
- [ ] Run all SQL migration scripts
- [ ] Enable RLS on all tables
- [ ] Create indexes
- [ ] Set up bucket storage
- [ ] Configure environment variables
- [ ] Test data sync locally
- [ ] Deploy to production
- [ ] Set up automated backups
- [ ] Monitor Sync logs

---

**Last Updated**: March 31, 2026
**Schema Version**: 1.0
**Maintenance**: Quarterly review recommended
