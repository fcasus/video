

rem compile for windows
deno compile --target x86_64-pc-windows-msvc --unstable --allow-read --allow-write --allow-run --lite --allow-net deno-scenes.js --output deno-scenes.exe

rem compile for mac
rem deno compile --target x86_64-apple-darwin --unstable --allow-read --allow-write --allow-run --lite --allow-net deno-scenes.js  --output deno-scenes.app

pause
