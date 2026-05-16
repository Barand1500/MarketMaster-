// Sayfa genelinde aktif olan bölüm yardım kayıtlarını tutar.
// Her SectionHelpButton, mount olduğunda buraya kaydolur.
const sections = [];
let counter = 0;

export function createHelpId() {
  return `help-sec-${++counter}`;
}

export function registerSection(id, title, content) {
  const idx = sections.findIndex(s => s.id === id);
  if (idx >= 0) sections[idx] = { id, title, content };
  else sections.push({ id, title, content });
}

export function unregisterSection(id) {
  const idx = sections.findIndex(s => s.id === id);
  if (idx >= 0) sections.splice(idx, 1);
}

// F1 sırasında anlık listeyi döner (snapshot)
export function getSections() {
  return [...sections];
}
