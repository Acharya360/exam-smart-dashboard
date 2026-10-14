# Database Credentials & Information

**Project Name:** Exam Smart Dashboard (ExamTrack)

## Supabase Connection Details
- **Supabase URL (REST API):** `https://woqhizacenduogpxglen.supabase.co`
- **Database User:** `postgres`
- **Database Name:** `postgres` (Default for Supabase)
- **Database Password:** `ExamTrack@2026`

---

## Connection Strings

Depending on how you connect to the database (direct connection vs connection pooler), you can use one of the following strings. 
*(Note: The `@` symbol in the password has been URL-encoded to `%40` below).*

### 1. Direct Connection (Standard IPv4 / IPv6)
```text
postgresql://postgres:ExamTrack%402026@db.woqhizacenduogpxglen.supabase.co:5432/postgres
```

### 2. Connection Pooler (Transaction Mode)
*(Use this if your network or Supabase region restricts direct connections).*
```text
postgresql://postgres.woqhizacenduogpxglen:ExamTrack%402026@aws-0-REGION.pooler.supabase.com:6543/postgres
```
*Note: Replace `REGION` with the region your Supabase project is hosted in (e.g., `ap-south-1`, `us-east-1`). You can verify this in your Supabase Dashboard under Settings -> Database -> Connection String.*
