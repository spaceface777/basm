### WASM build instructions 

[emscripten](https://emscripten.org/download/) is required.

```bash
em++ -o main.js -Os -flto -Wall -Wextra -s ENVIRONMENT=web -s WASM=1 -s MODULARIZE=1 -s TOTAL_MEMORY=32MB \
    /path/to/wasm/build/of/libkeystone.a /path/to/wasm/build/of/libcapstone.a \
    main.cc --bind -sFILESYSTEM=0 -fno-rtti -fno-exceptions -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0
```
