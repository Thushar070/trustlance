const lucide = require("lucide-react");
const keys = Object.keys(lucide);
console.log("Keys containing 'google':", keys.filter(k => k.toLowerCase().includes("google")));
console.log("Keys containing 'chrome':", keys.filter(k => k.toLowerCase().includes("chrome")));
console.log("Keys containing 'slack':", keys.filter(k => k.toLowerCase().includes("slack")));
console.log("Keys containing 'figma':", keys.filter(k => k.toLowerCase().includes("figma")));
console.log("Keys containing 'codepen':", keys.filter(k => k.toLowerCase().includes("codepen")));
