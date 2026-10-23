# PentAGI for Acharya360 Exam Smart Dashboard

**PentAGI** is an autonomous AI agent system designed for full-scope penetration testing, vulnerability discovery, and security reporting. This directory contains the containerized PentAGI stack configured specifically for assessing the **Acharya360 Exam Smart Dashboard (ExamTrack)** application.

---

## Prerequisites
- **Docker Desktop** installed and running on Windows.
- **Google Gemini API Key** (or OpenAI/Anthropic key). If you already have a `GEMINI_API_KEY` in the project root `.env`, `start-pentagi.ps1` will automatically detect and configure it.

---

## Quick Start

### 1. Launch PentAGI
Run the PowerShell launcher script:
```powershell
.\start-pentagi.ps1
```
Or via npm from the project root:
```bash
npm run pentagi:start
```

The script will automatically:
- Verify Docker daemon connectivity.
- Generate `.env` with cryptographically secure random session salts and database passwords.
- Configure Google Gemini as the LLM provider via its OpenAI-compatible endpoint.
- Boot the containers in detached mode.

### 2. Access the Web Interface
- **URL**: [https://localhost:8443](https://localhost:8443) *(Accept the self-signed SSL certificate in your browser)*
- **Default Email**: `admin@pentagi.com`
- **Default Password**: `admin`

### 3. Stop the Containers
When testing is complete:
```powershell
.\stop-pentagi.ps1
```
Or via npm:
```bash
npm run pentagi:stop
```

---

## Target Configuration & Scopes
See [TARGET_CONFIG.md](./TARGET_CONFIG.md) for target host mappings, Supabase RLS test vectors, 4-tier RBAC privilege escalation tests, and sample prompt recipes.
