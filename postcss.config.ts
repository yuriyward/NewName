import type { Plugin } from 'postcss';

/**
 * Remove @property rules that don't work in Shadow DOM.
 * Tailwind v4 uses @property to define CSS custom property types and initial values,
 * but these declarations are ignored in Shadow DOM contexts.
 */
const removeAtProperty: Plugin = {
  postcssPlugin: 'remove-at-property',
  AtRule: {
    property(atRule) {
      atRule.remove();
    },
  },
};

/**
 * Transform @layer properties to expose fallback styles for Shadow DOM.
 * Tailwind wraps property definitions in @supports feature queries.
 * Shadow DOM needs the fallback definitions to be directly available.
 */
const transformPropertiesLayer: Plugin = {
  postcssPlugin: 'transform-properties-layer',
  AtRule: {
    layer(atRule) {
      if (atRule.params !== 'properties') {
        return;
      }

      atRule.walkAtRules('supports', (supportsRule) => {
        const supportedRules = supportsRule.nodes;
        supportsRule.remove();

        if (supportedRules) {
          atRule.append(supportedRules);
        }
      });
    },
  },
};

export default {
  plugins: [removeAtProperty, transformPropertiesLayer],
};
