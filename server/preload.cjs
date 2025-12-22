// preload.cjs - This runs BEFORE your main script
'use strict';

console.log('🔧 PRELOAD: Patching WebAssembly for CloudLinux...');

// Set environment variables IMMEDIATELY
process.env.UNDICI_NO_WASM = '1';
process.env.NODE_OPTIONS = '--max-old-space-size=1024';

// Monkey-patch WebAssembly to prevent any usage
if (global.WebAssembly) {
    console.log('🔧 PRELOAD: Disabling WebAssembly...');
    
    // Store original for emergency
    global.__originalWebAssembly = global.WebAssembly;
    
    // Replace with a stub that throws
    global.WebAssembly = {
        Module: class {
            constructor() {
                throw new Error('WebAssembly.Module is disabled on CloudLinux');
            }
        },
        Instance: class {
            constructor() {
                throw new Error('WebAssembly.Instance is disabled on CloudLinux');
            }
        },
        Memory: class {
            constructor() {
                throw new Error('WebAssembly.Memory is disabled on CloudLinux');
            }
        },
        Table: class {
            constructor() {
                throw new Error('WebAssembly.Table is disabled on CloudLinux');
            }
        },
        Global: class {
            constructor() {
                throw new Error('WebAssembly.Global is disabled on CloudLinux');
            }
        },
        compile: function() {
            throw new Error('WebAssembly.compile() is disabled on CloudLinux');
        },
        instantiate: function() {
            throw new Error('WebAssembly.instantiate() is disabled on CloudLinux');
        },
        instantiateStreaming: function() {
            throw new Error('WebAssembly.instantiateStreaming() is disabled on CloudLinux');
        },
        validate: function() {
            return false;
        },
        CompileError: class extends Error {
            constructor(message) {
                super(message || 'WebAssembly.CompileError');
            }
        },
        LinkError: class extends Error {
            constructor(message) {
                super(message || 'WebAssembly.LinkError');
            }
        },
        RuntimeError: class extends Error {
            constructor(message) {
                super(message || 'WebAssembly.RuntimeError');
            }
        }
    };
    
    // Freeze to prevent modification
    Object.freeze(global.WebAssembly);
}

// Also patch Headers for Supabase compatibility
if (typeof global.Headers === 'undefined') {
    global.Headers = class Headers {
        constructor(init = []) {
            this.map = new Map();
            if (Array.isArray(init)) {
                for (const [key, value] of init) {
                    this.append(key, value);
                }
            }
        }
        append(name, value) {
            this.map.set(name.toLowerCase(), value);
        }
        get(name) {
            return this.map.get(name.toLowerCase());
        }
        set(name, value) {
            this.map.set(name.toLowerCase(), value);
        }
        entries() {
            return this.map.entries();
        }
        keys() {
            return this.map.keys();
        }
        values() {
            return this.map.values();
        }
        [Symbol.iterator]() {
            return this.entries();
        }
    };
}

console.log('🔧 PRELOAD: WebAssembly patching complete');