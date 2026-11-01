@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Memasang dependensi, mohon tunggu...
  call npm install
)
echo Membuka http://localhost:5173 ...
call npm run dev -- --open
pause
