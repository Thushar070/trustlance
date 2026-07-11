const lucide = require("lucide-react");
const keys = Object.keys(lucide);
console.log("Total keys:", keys.length);
console.log("Keys containing 'git':", keys.filter(k => k.toLowerCase().includes("git")));
console.log("Keys containing 'hub':", keys.filter(k => k.toLowerCase().includes("hub")));
console.log("Keys containing 'cat':", keys.filter(k => k.toLowerCase().includes("cat")));
console.log("Keys containing 'brand':", keys.filter(k => k.toLowerCase().includes("brand")));
console.log("Keys containing 'logo':", keys.filter(k => k.toLowerCase().includes("logo")));
