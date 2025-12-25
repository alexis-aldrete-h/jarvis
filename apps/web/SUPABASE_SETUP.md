# Supabase Setup for Gantt Data

This guide explains how to set up Supabase to store your projects, tasks, and subtasks data.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A Supabase project created

## Step 1: Create Database Tables

Run the SQL migration file to create the necessary tables:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-migrations/001_create_gantt_tables.sql`
4. Paste and run the SQL in the SQL Editor

This will create three tables:
- `gantt_projects` - Stores project data
- `gantt_tasks` - Stores task data (linked to projects)
- `gantt_subtasks` - Stores subtask data (linked to tasks and projects)

## Step 2: Configure Environment Variables

Create a `.env.local` file in the `apps/web` directory (if it doesn't exist) and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### How to find your Supabase credentials:

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon)
3. Click on **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Enable Row Level Security (RLS) and Create Policies

**IMPORTANT:** You must enable RLS and create policies for the tables to work properly.

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-migrations/002_enable_rls_and_policies.sql`
4. Paste and run the SQL in the SQL Editor

This will:
- Enable RLS on all three tables
- Create policies that allow anonymous users (your app using the anon key) to read/write all data

**Note:** These policies allow full access to anyone with the anon key. For production, you may want to restrict access based on user authentication.

## Step 4: Restart Your Development Server

After adding the environment variables, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

- **On Load**: The app first tries to load data from Supabase. If Supabase is not configured or returns no data, it falls back to localStorage.
- **On Save**: The app saves to both Supabase (if configured) and localStorage (as a backup).
- **Migration**: If you have existing data in localStorage, it will be loaded first. When you save, it will be synced to Supabase.

## Troubleshooting

### Data not appearing in Supabase

1. Check that your environment variables are set correctly
2. Verify the tables were created successfully
3. Check the browser console for any error messages
4. Ensure your Supabase project is active

### Still using localStorage

If the app is still using localStorage:
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart your development server after adding environment variables
- Check the browser console for Supabase connection errors

## Database Schema

### gantt_projects
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `start_date` (TEXT, NOT NULL)
- `end_date` (TEXT, NOT NULL)
- `color` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### gantt_tasks
- `id` (TEXT, PRIMARY KEY)
- `project_id` (TEXT, FOREIGN KEY → gantt_projects.id)
- `name` (TEXT, NOT NULL)
- `start_date` (TEXT, NOT NULL)
- `end_date` (TEXT, NOT NULL)
- `color` (TEXT, nullable)
- `priority` (TEXT, nullable)
- `category` (TEXT, nullable)
- `total_points` (NUMERIC, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### gantt_subtasks
- `id` (TEXT, PRIMARY KEY)
- `task_id` (TEXT, FOREIGN KEY → gantt_tasks.id)
- `project_id` (TEXT, FOREIGN KEY → gantt_projects.id)
- `name` (TEXT, NOT NULL)
- `start_date` (TEXT, NOT NULL)
- `end_date` (TEXT, NOT NULL)
- `color` (TEXT, nullable)
- `priority` (TEXT, nullable)
- `category` (TEXT, nullable)
- `story_points` (NUMERIC, nullable)
- `difficulty` (NUMERIC, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

