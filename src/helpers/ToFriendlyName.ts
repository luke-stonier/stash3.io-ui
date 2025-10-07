export default function toFriendlyName(key: string): string {
    return key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')     // space between lower/number → Upper
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // split ABCDef → ABC Def
        .replace(/^./, s => s.toUpperCase())        // capitalize first char
        .trim();
}