import { ANGULAR_TEMPLATE } from "./runtime/angular";
import { REACT_TEMPLATE } from "./runtime/react";
import { REACT_TYPESCRIPT_TEMPLATE } from "./runtime/react-typescript";
import { SOLID_TEMPLATE } from "./runtime/solid";
import { SVELTE_TEMPLATE } from "./runtime/svelte";
import { TEST_TYPESCRIPT_TEMPLATE } from "./runtime/tests-ts";
import { VANILLA_TEMPLATE } from "./runtime/vanilla";
import { VANILLA_TYPESCRIPT_TEMPLATE } from "./runtime/vanilla-typescript";
import { VUE_TEMPLATE } from "./runtime/vue";
import { VUE_TS_TEMPLATE } from "./runtime/vue-ts";
import { STATIC_TEMPLATE } from "./static";

export { ANGULAR_TEMPLATE } from "./runtime/angular";
export { REACT_TEMPLATE } from "./runtime/react";
export { REACT_TYPESCRIPT_TEMPLATE } from "./runtime/react-typescript";
export { SOLID_TEMPLATE } from "./runtime/solid";
export { SVELTE_TEMPLATE } from "./runtime/svelte";
export { TEST_TYPESCRIPT_TEMPLATE } from "./runtime/tests-ts";
export { VANILLA_TEMPLATE } from "./runtime/vanilla";
export { VANILLA_TYPESCRIPT_TEMPLATE } from "./runtime/vanilla-typescript";
export { VUE_TEMPLATE } from "./runtime/vue";

// Browser-runnable templates. Aliases map removed Node-env templates
// to the closest equivalent so existing assignments keep loading.
export const SANDBOX_TEMPLATES = {
  static: STATIC_TEMPLATE,
  angular: ANGULAR_TEMPLATE,
  react: REACT_TEMPLATE,
  "react-ts": REACT_TYPESCRIPT_TEMPLATE,
  solid: SOLID_TEMPLATE,
  svelte: SVELTE_TEMPLATE,
  "test-ts": TEST_TYPESCRIPT_TEMPLATE,
  "vanilla-ts": VANILLA_TYPESCRIPT_TEMPLATE,
  vanilla: VANILLA_TEMPLATE,
  vue: VUE_TEMPLATE,
  "vue-ts": VUE_TS_TEMPLATE,
  // Aliases for legacy assignments.
  "vite-react": REACT_TEMPLATE,
  "vite-react-ts": REACT_TYPESCRIPT_TEMPLATE,
  "vite-preact": REACT_TEMPLATE,
  "vite-preact-ts": REACT_TYPESCRIPT_TEMPLATE,
  "vite-vue": VUE_TEMPLATE,
  "vite-vue-ts": VUE_TS_TEMPLATE,
  "vite-svelte": SVELTE_TEMPLATE,
  "vite-svelte-ts": SVELTE_TEMPLATE,
  vite: VANILLA_TEMPLATE,
  nextjs: REACT_TEMPLATE,
  node: VANILLA_TEMPLATE,
  astro: STATIC_TEMPLATE,
};
