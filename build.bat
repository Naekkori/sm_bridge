@echo off
echo Building WASM...
wasm-pack build --target web

echo Copying JS assets to pkg...
copy /Y src\editor\editor_support.js pkg\

echo Done!
