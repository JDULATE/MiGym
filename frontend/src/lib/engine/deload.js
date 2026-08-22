// Deload policy constants (spec structure: deload/).
//
// Re-exported from the policy implementation so the engine boundary exposes the whole
// rule set in one place while views/MCP keep their stable import paths. See
// ../progression.js for the reasoning: repeated misses back the load off by 10 %, landing
// on a loadable step, and Greyskull resets on the first failure where the others wait.
export { DELOAD_AFTER, DELOAD_FACTOR, deloadTo } from '../progression.js'
