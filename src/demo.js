const doc = (id, libelle, type, file, day) => ({
  id,
  libelle,
  type,
  visible: true,
  mime: 'image/svg+xml',
  taille: 2400,
  depose_le: '2026-09-' + day + 'T09:00:00Z',
  demoUrl: '/' + file,
  objet_cle: file,
})
const initial = {
  classe: { id: 1, slug: 'demo', libelle: '3e B', matiere: 'Physique-Chimie' },
  domaines: [
    {
      id: 1,
      libelle: 'Électricité & énergie',
      description: 'Comprendre les circuits qui nous entourent.',
      ordre: 0,
      chapitres: [
        {
          id: 11,
          libelle: 'Les circuits électriques',
          description:
            'Objectifs : identifier les composants d’un circuit et expliquer pourquoi une lampe s’allume. Commence par la fiche de cours, puis vérifie tes connaissances.',
          ordre: 0,
          documents: [
            doc(
              101,
              'Le circuit électrique · fiche de cours',
              'cours',
              'exemple-circuit.svg',
              '08',
            ),
            doc(
              102,
              'Circuit ouvert ou fermé ? · entraînement',
              'controle',
              'exemple-exercice.svg',
              '10',
            ),
            doc(
              103,
              'Comprendre le circuit · correction',
              'correction',
              'exemple-correction.svg',
              '12',
            ),
          ],
        },
        {
          id: 12,
          libelle: 'L’énergie au quotidien',
          description:
            'Repère les conversions d’énergie dans les objets de tous les jours.',
          ordre: 1,
          documents: [
            doc(
              104,
              'Les conversions d’énergie · mémo',
              'cours',
              'exemple-energie.svg',
              '15',
            ),
          ],
        },
      ],
    },
    {
      id: 2,
      libelle: 'Mouvement & interactions',
      description: null,
      ordre: 1,
      chapitres: [
        {
          id: 21,
          libelle: 'Décrire un mouvement',
          description:
            'Les prochains supports de ce chapitre seront disponibles ici.',
          ordre: 0,
          documents: [],
        },
      ],
    },
  ],
}
let state = structuredClone(initial),
  counter = 1000
const allChapters = () => state.domaines.flatMap((d) => d.chapitres)
const findDoc = (id) =>
  allChapters()
    .flatMap((c) => c.documents)
    .find((d) => d.id === id)
export function getDemoData() {
  return structuredClone(state)
}
export function resetDemo() {
  state = structuredClone(initial)
}
export const demoAdmin = {
  async tree() {
    return getDemoData()
  },
  async listClasses() {
    return [
      {
        ...state.classe,
        nb_chapitres: allChapters().length,
        nb_masques: allChapters()
          .flatMap((c) => c.documents)
          .filter((d) => !d.visible).length,
      },
    ]
  },
  async createDomaine(_, libelle, description) {
    const id = counter++
    state.domaines.push({ id, libelle, description, chapitres: [] })
    return id
  },
  async updateDomaine(id, fields) {
    Object.assign(
      state.domaines.find((d) => d.id === id),
      fields,
    )
    state.domaines.sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
  },
  async createChapitre(dmId, libelle, description) {
    const id = counter++
    state.domaines
      .find((d) => d.id === dmId)
      .chapitres.push({ id, libelle, description, documents: [] })
    return id
  },
  async updateChapitre(id, fields) {
    Object.assign(
      allChapters().find((c) => c.id === id),
      fields,
    )
    state.domaines.forEach((d) =>
      d.chapitres.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)),
    )
  },
  async renameDocument(id, libelle) {
    findDoc(id).libelle = libelle
  },
  async toggleDocument(id, visible) {
    findDoc(id).visible = Boolean(visible)
  },
  async deleteDocument(id) {
    allChapters().forEach(
      (c) => (c.documents = c.documents.filter((d) => d.id !== id)),
    )
  },
  async deleteChapitre(id) {
    state.domaines.forEach(
      (d) => (d.chapitres = d.chapitres.filter((c) => c.id !== id)),
    )
  },
  async deleteDomaine(id) {
    state.domaines = state.domaines.filter((d) => d.id !== id)
  },
}
export async function demoUpload({
  chapitre_id,
  type,
  libelle,
  file,
  visible,
}) {
  // Files are never uploaded in the demonstration. Local blob URLs last until reload.
  const result = {
    id: counter++,
    type,
    libelle,
    mime: file.type,
    taille: file.size,
    visible,
    objet_cle: file.name,
    demoUrl: URL.createObjectURL(file),
    depose_le: new Date().toISOString(),
  }
  allChapters()
    .find((c) => c.id === chapitre_id)
    .documents.push(result)
  return result
}
