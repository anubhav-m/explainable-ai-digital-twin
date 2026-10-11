// Chart colors come from the theme's CSS variables, so charts follow light and dark without re-rendering
export const chartColors = {
  ink: 'var(--ink)', // the model's estimate
  seal: 'var(--seal)', // lab results (always with an ink outline)
  grid: 'var(--hair)',
  axis: 'var(--mute)',
  surface: 'var(--sheet)',
};

export const chartFont = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--mute)' };
