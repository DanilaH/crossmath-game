const assets = import.meta.glob<string>('./icons/*.webp', { eager: true, query: '?url', import: 'default' });

export function menuIcon(name: string): HTMLImageElement {
  const image = document.createElement('img');
  image.src = assets[`./icons/${name}.webp`]!;
  image.className = `menu-icon icon-${name}`;
  image.alt = '';
  image.draggable = false;
  return image;
}
