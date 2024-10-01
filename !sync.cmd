@echo off

set changed=0
for /f %%i in ('git status --porcelain') do set changed=1

if %changed%==1 goto :trueblock
goto :endif

:trueblock
git reset HEAD~
git add .
git commit -m "sync"
git push -f

:endif

pause
