import test from 'node:test'
import assert from 'node:assert/strict'
import { saveDraft } from '../src/saveDraft.js'

function service() {
  const calls = [],
    api = {}
  let id = 100
  for (const name of [
    'createDomaine',
    'createChapitre',
    'updateDomaine',
    'updateChapitre',
    'renameDocument',
    'toggleDocument',
    'deleteDocument',
    'deleteChapitre',
    'deleteDomaine',
  ]) {
    api[name] = async (...args) => {
      calls.push([name, ...args])
      return id++
    }
  }
  const upload = async (args) => {
    calls.push(['upload', args])
    return {
      id: id++,
      libelle: args.libelle,
      visible: args.visible,
      type: args.type,
    }
  }
  return { calls, api, upload }
}
const empty = () => ({ domaines: [] })
function newDraft() {
  return {
    domaines: [
      {
        id: -1,
        libelle: 'Électricité',
        description: null,
        chapitres: [
          {
            id: -2,
            libelle: 'Circuit',
            description: 'Objectif',
            documents: [
              {
                id: -3,
                libelle: 'Cours privé',
                type: 'cours',
                visible: false,
                _new: true,
              },
              {
                id: -4,
                libelle: 'Correction publiée',
                type: 'correction',
                visible: true,
                _new: true,
              },
            ],
          },
        ],
      },
    ],
  }
}
const newFiles = () =>
  new Map([
    [-3, { name: 'cours.pdf', size: 10 }],
    [-4, { name: 'correction.pdf', size: 10 }],
  ])
test('new uploads use the exact draft visibility, including hidden courses and published corrections', async () => {
  const s = service(),
    draft = newDraft(),
    baseline = empty(),
    files = newFiles()
  await saveDraft({ draft, baseline, files, classeId: 1, ...s })
  assert.deepEqual(
    s.calls.filter((c) => c[0] === 'upload').map((c) => c[1].visible),
    [false, true],
  )
  assert.ok(draft.domaines[0].id > 0)
  assert.ok(
    draft.domaines[0].chapitres[0].documents.every((d) => d.id > 0 && !d._new),
  )
  assert.equal(files.size, 0)
})
test('a retry after the second upload fails does not recreate earlier successful writes', async () => {
  const s = service(),
    draft = newDraft(),
    baseline = empty(),
    files = newFiles()
  let attempts = 0
  const upload = async (args) => {
    attempts++
    if (attempts === 2) throw new Error('Network failure')
    return s.upload(args)
  }
  const args = { draft, baseline, files, classeId: 1, api: s.api, upload }
  await assert.rejects(saveDraft(args), /Network failure/)
  assert.equal(files.size, 1)
  await saveDraft(args)
  assert.equal(s.calls.filter((c) => c[0] === 'createDomaine').length, 1)
  assert.equal(s.calls.filter((c) => c[0] === 'createChapitre').length, 1)
  assert.equal(s.calls.filter((c) => c[0] === 'upload').length, 2)
  assert.equal(baseline.domaines[0].chapitres[0].documents.length, 2)
})
test('a missing local file fails explicitly and never silently drops a document', async () => {
  await assert.rejects(
    saveDraft({
      draft: newDraft(),
      baseline: empty(),
      files: new Map(),
      classeId: 1,
      ...service(),
    }),
    /doit être ajouté/,
  )
})
test('deleting a whole subtree invokes its deletion only once', async () => {
  const s = service(),
    baseline = {
      domaines: [{ id: 1, chapitres: [{ id: 2, documents: [{ id: 3 }] }] }],
    }
  await saveDraft({
    draft: empty(),
    baseline,
    files: new Map(),
    classeId: 1,
    ...s,
  })
  assert.deepEqual(s.calls, [['deleteDomaine', 1]])
  assert.deepEqual(baseline, empty())
})
test('rename acknowledged before failed visibility update is not repeated', async () => {
  const s = service(),
    baseline = {
      domaines: [
        {
          id: 1,
          libelle: 'D',
          description: null,
          ordre: 0,
          chapitres: [
            {
              id: 2,
              libelle: 'C',
              description: null,
              ordre: 0,
              documents: [{ id: 3, libelle: 'Old', visible: false }],
            },
          ],
        },
      ],
    }
  const draft = structuredClone(baseline)
  Object.assign(draft.domaines[0].chapitres[0].documents[0], {
    libelle: 'New',
    visible: true,
  })
  let tries = 0
  const toggle = s.api.toggleDocument
  s.api.toggleDocument = async (...args) => {
    if (!tries++) throw new Error('Retry')
    return toggle(...args)
  }
  const args = { draft, baseline, files: new Map(), classeId: 1, ...s }
  await assert.rejects(saveDraft(args), /Retry/)
  await saveDraft(args)
  assert.equal(s.calls.filter((c) => c[0] === 'renameDocument').length, 1)
  assert.equal(s.calls.filter((c) => c[0] === 'toggleDocument').length, 1)
})
test('persisted chapter order and descriptions match the desired tree', async () => {
  const s = service(),
    baseline = {
      domaines: [
        {
          id: 1,
          libelle: 'D',
          ordre: 0,
          description: null,
          chapitres: [
            { id: 2, libelle: 'A', ordre: 0, description: null, documents: [] },
            { id: 3, libelle: 'B', ordre: 1, description: null, documents: [] },
          ],
        },
      ],
    }
  const draft = structuredClone(baseline)
  draft.domaines[0].chapitres.reverse()
  draft.domaines[0].chapitres[0].description = 'Une consigne'
  await saveDraft({ draft, baseline, files: new Map(), classeId: 1, ...s })
  assert.deepEqual(
    s.calls
      .filter((c) => c[0] === 'updateChapitre')
      .map((c) => [c[1], c[2].ordre]),
    [
      [3, 0],
      [2, 1],
    ],
  )
  assert.equal(
    baseline.domaines[0].chapitres.find((c) => c.id === 3).description,
    'Une consigne',
  )
})
