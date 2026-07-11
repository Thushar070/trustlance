const lucide = require("lucide-react");
const keys = Object.keys(lucide);
const matches = keys.filter(k => {
  const kl = k.toLowerCase();
  return kl === "code" || kl === "code2" || kl === "link" || kl === "link2" || kl === "externallink" || kl === "globe" || kl === "terminal";
});
console.log("Matching icons found:", matches);
