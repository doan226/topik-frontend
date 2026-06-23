@echo off
:: Repo layout: WEDTOPIKAI/topik-backend/topikai/scripts/ -> WEDTOPIKAI/topik-frontend
set "FRONTEND_ENV=%~dp0..\..\..\topik-frontend\.env.development.local"
for %%I in ("%FRONTEND_ENV%") do set "FRONTEND_ENV=%%~fI"
