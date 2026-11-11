type ElementClass = CustomElementConstructor;

/**
 * Class decorator that registers a custom element only once.
 * Prevents "name has already been used with this registry" errors when the
 * bundle is loaded twice or another bundle registered the same tag.
 */
export const safeCustomElement =
  (tag: string) =>
  (cls: ElementClass): void => {
    if (!customElements.get(tag)) {
      customElements.define(tag, cls);
    }
  };
