// Tests that compile components into data: URLs cannot resolve bare package names, so they
// point lucide-react at its resolved file instead. lucideBindings is for tests that strip imports.
export const lucideUrl = import.meta.resolve('lucide-react')
export const lucideBindings = `import * as __lucide from '${lucideUrl}';\nconst { ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Crown, Plus, Star, X } = __lucide;\n`
export const withLucide = source => source.replaceAll("'lucide-react'", JSON.stringify(lucideUrl))
