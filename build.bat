@echo off
echo Cleaning old pkg...
if exist pkg rd /s /q pkg

echo Building WASM...
wasm-pack build --target web

echo Copying assets to pkg...
:: index.htm 복사 (template 폴더에 있는 최신본 사용)
if exist template\index.htm copy /Y template\index.htm pkg\index.htm
if exist template\index.html copy /Y template\index.html pkg\index.html

echo Done!