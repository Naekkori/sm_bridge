echo "cleaing old pkg..."
if [ -d "pkg" ]; then
    echo "pkg directory exists. removing..."
    rm -rfv pkg
fi
wasm-pack build --target web
if [ -f "template/index.html" ]; then
    cp template/index.html pkg/index.html
    echo "index.html copied."
fi
if [ -f "template/index.htm" ]; then
    cp template/index.htm pkg/index.htm
    echo "index.htm copied."
fi
echo "build completed."