// Keep a journal of acknowledged writes. A retry continues after the last
// successful operation instead of recreating already uploaded documents.
// This is not a database transaction: the caller displays partial failures.
export async function saveDraft({
  draft,
  baseline,
  files,
  classeId,
  api,
  upload,
  onProgress = () => {},
}) {
  for (let di = 0; di < draft.domaines.length; di++) {
    const dm = draft.domaines[di]
    let bd = baseline.domaines.find((x) => x.id === dm.id)
    if (dm.id < 0) {
      onProgress(`Création de « ${dm.libelle} »…`)
      dm.id = await api.createDomaine(classeId, dm.libelle, dm.description)
      bd = { ...dm, ordre: -1, chapitres: [] }
      baseline.domaines.push(bd)
    }
    if (!bd)
      throw new Error(
        'Le brouillon ne correspond plus à la classe. Recharge la page.',
      )
    const fields = {
      libelle: dm.libelle,
      description: dm.description || null,
      ordre: di,
    }
    Object.assign(dm, fields)
    if (Object.entries(fields).some(([k, v]) => (bd[k] ?? null) !== v)) {
      await api.updateDomaine(dm.id, fields)
      Object.assign(bd, fields)
    }
    for (let ci = 0; ci < dm.chapitres.length; ci++) {
      const ch = dm.chapitres[ci]
      let bc = bd.chapitres.find((x) => x.id === ch.id)
      if (ch.id < 0) {
        onProgress(`Création de « ${ch.libelle} »…`)
        ch.id = await api.createChapitre(dm.id, ch.libelle, ch.description)
        bc = { ...ch, ordre: -1, documents: [] }
        bd.chapitres.push(bc)
      }
      if (!bc)
        throw new Error(
          'Ce chapitre n’existe plus dans le brouillon. Recharge la page.',
        )
      const fields = {
        libelle: ch.libelle,
        description: ch.description || null,
        ordre: ci,
      }
      Object.assign(ch, fields)
      if (Object.entries(fields).some(([k, v]) => (bc[k] ?? null) !== v)) {
        await api.updateChapitre(ch.id, fields)
        Object.assign(bc, fields)
      }
      for (const doc of ch.documents) {
        if (doc.id < 0) {
          const tempId = doc.id,
            file = files.get(tempId)
          if (!file)
            throw new Error(
              `Le fichier « ${doc.libelle} » doit être ajouté à nouveau.`,
            )
          onProgress(`Envoi de « ${doc.libelle} »…`)
          const saved = await upload({
            chapitre_id: ch.id,
            type: doc.type,
            libelle: doc.libelle,
            file,
            visible: doc.visible,
          })
          Object.assign(doc, saved, { _new: false })
          bc.documents.push({ ...doc })
          files.delete(tempId)
        } else {
          const bdoc = bc.documents.find((d) => d.id === doc.id)
          if (!bdoc)
            throw new Error('Un document a changé. Recharge la classe.')
          if (doc.libelle !== bdoc.libelle) {
            await api.renameDocument(doc.id, doc.libelle)
            bdoc.libelle = doc.libelle
          }
          if (!!doc.visible !== !!bdoc.visible) {
            await api.toggleDocument(doc.id, doc.visible)
            bdoc.visible = doc.visible
          }
        }
      }
    }
  }
  // Delete last, and only once per subtree. Never delete a child twice.
  for (const bd of [...baseline.domaines]) {
    const dm = draft.domaines.find((d) => d.id === bd.id)
    if (!dm) {
      onProgress('Suppression du grand titre…')
      await api.deleteDomaine(bd.id)
      baseline.domaines = baseline.domaines.filter((d) => d.id !== bd.id)
      continue
    }
    for (const bc of [...bd.chapitres]) {
      const ch = dm.chapitres.find((c) => c.id === bc.id)
      if (!ch) {
        await api.deleteChapitre(bc.id)
        bd.chapitres = bd.chapitres.filter((c) => c.id !== bc.id)
        continue
      }
      for (const doc of [...bc.documents]) {
        if (!ch.documents.some((d) => d.id === doc.id)) {
          await api.deleteDocument(doc.id)
          bc.documents = bc.documents.filter((d) => d.id !== doc.id)
        }
      }
    }
  }
}
