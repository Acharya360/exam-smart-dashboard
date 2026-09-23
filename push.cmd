@echo off
echo Adding changes to git...
git add .

echo Committing changes...
git commit -m "Auto-update: %date% %time%"

echo Pushing to GitHub...
git push

echo.
echo ========================================
echo Done! Changes pushed to GitHub successfully.
echo ========================================
pause
