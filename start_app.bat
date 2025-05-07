@echo off
echo Demarrage de l'application My-App...

echo.
echo === Demarrage du backend ===
start cmd /k "cd backend && python start_backend.py"

echo.
echo === Demarrage du frontend ===
start cmd /k "npm run dev"

echo.
echo Tous les services ont ete demarres !
echo Acces a l'application : http://localhost:5173
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause > nul