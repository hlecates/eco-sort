export function toTopLevel(label) { return label.split(':')[0]; }
export function tipFor(top) {
  if (top === 'recycle')  return 'Empty liquids; no bags or soft film.';
  if (top === 'compost')  return 'No plastics; include food scraps & soiled paper.';
  if (top === 'landfill') return 'When in doubt, throw it out (no tanglers).';
  return 'Try again with better lighting; show one item.';
}
