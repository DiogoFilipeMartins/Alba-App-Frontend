/**
 * Resolves Mapbox relative style URLs (mapbox://) inside a Style JSON object
 * into fully qualified HTTPS URLs using the Mapbox API domain and access token.
 * This is required for MapLibre, which does not support mapbox:// natively.
 */
export function resolveMapboxStyle(style: any, token: string): any {
  if (!style) return style;

  // Clone style to avoid side-effects
  const resolved = JSON.parse(JSON.stringify(style));

  // 1. Resolve sprite
  if (typeof resolved.sprite === 'string' && resolved.sprite.startsWith('mapbox://sprites/')) {
    const spritePath = resolved.sprite.replace('mapbox://sprites/', '');
    resolved.sprite = `https://api.mapbox.com/styles/v1/${spritePath}/sprite?access_token=${token}`;
  }

  // 2. Resolve glyphs
  if (typeof resolved.glyphs === 'string' && resolved.glyphs.startsWith('mapbox://fonts/')) {
    const glyphsPath = resolved.glyphs.replace('mapbox://fonts/', '');
    resolved.glyphs = `https://api.mapbox.com/fonts/v1/${glyphsPath}?access_token=${token}`;
  }

  // 3. Resolve sources
  if (resolved.sources) {
    for (const key of Object.keys(resolved.sources)) {
      const source = resolved.sources[key];
      if (source && typeof source.url === 'string' && source.url.startsWith('mapbox://')) {
        const sourcePath = source.url.replace('mapbox://', '');
        source.url = `https://api.mapbox.com/v4/${sourcePath}.json?access_token=${token}`;
      }
    }
  }

  return resolved;
}
