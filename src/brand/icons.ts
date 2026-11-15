import { MARK_MONO_PATH, MARK_VIEWBOX } from './paths';

/**
 * Registers the `upkeep:` icon set with Home Assistant so the sidebar can show
 * the brand mark (`upkeep:logo`). Home Assistant icon sets are single-colour,
 * so this is the one-ink version of the mark, drawn in the sidebar text colour.
 */
type IconLoader = (name: string) => Promise<{ path: string; viewBox: string } | undefined>;

const w = window as unknown as { customIconsets?: Record<string, IconLoader> };
w.customIconsets = w.customIconsets || {};
w.customIconsets.upkeep = async (name) =>
  name === 'logo' ? { path: MARK_MONO_PATH, viewBox: MARK_VIEWBOX } : undefined;
