import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseClassCode,
  filterDocuments,
  flattenDocuments,
  validateFile,
  moveItem,
  MAX_FILE_SIZE,
} from '../src/catalog.js'

test('accepts a class code or full link without navigating to an external host', () => {
  assert.equal(parseClassCode('  3eB-Physique  '), '3eB-Physique')
  assert.equal(
    parseClassCode('https://example.org/#/classe/3eB-Physique?x=1'),
    '3eB-Physique',
  )
  for (const input of [
    'https://example.org',
    'javascript:alert(1)',
    'hello world',
    '../admin',
    '%ZZ',
    '',
  ])
    assert.equal(parseClassCode(input), '')
})
const docs = [
  {
    id: 1,
    libelle: 'L’énergie électrique',
    type: 'cours',
    chapitre: 'Électricité',
    domaine: 'Sciences',
    depose_le: '2026-09-01',
  },
  {
    id: 2,
    libelle: 'Circuit',
    type: 'correction',
    chapitre: 'Électricité',
    domaine: 'Sciences',
    depose_le: '2026-09-05',
  },
]
test('search is accent-insensitive and matches every word across the chapter and title', () => {
  assert.deepEqual(
    filterDocuments(docs, { query: ' electricite energie ' }).map((d) => d.id),
    [1],
  )
  assert.equal(filterDocuments(docs, { query: 'sciences' }).length, 2)
  assert.equal(filterDocuments(docs, { query: 'circuit energie' }).length, 0)
})
test('type, revision marks and sorting compose without changing the source', () => {
  assert.deepEqual(
    filterDocuments(docs, {
      scope: 'saved',
      marks: { 2: { saved: true } },
    }).map((d) => d.id),
    [2],
  )
  assert.deepEqual(
    filterDocuments(docs, {
      scope: 'unread',
      marks: { 1: { read: true } },
    }).map((d) => d.id),
    [2],
  )
  assert.deepEqual(
    filterDocuments(docs, { type: 'cours' }).map((d) => d.id),
    [1],
  )
  assert.deepEqual(
    filterDocuments(docs, { sort: 'recent' }).map((d) => d.id),
    [2, 1],
  )
  assert.deepEqual(
    docs.map((d) => d.id),
    [1, 2],
  )
})
test('catalog preserves chapter context and tolerates empty chapters', () => {
  const result = flattenDocuments([
    {
      libelle: 'Énergie',
      chapitres: [
        { id: 5, libelle: 'Circuits', documents: [docs[0]] },
        { id: 6, libelle: 'Vide' },
      ],
    },
  ])
  assert.equal(result[0].chapitreId, 5)
  assert.equal(result[0].domaine, 'Énergie')
  assert.equal(result.length, 1)
})
test('rejects unsupported, empty, and oversized files before sending', () => {
  assert.equal(validateFile({ name: 'Cours.PDF', size: 100 }), '')
  assert.ok(validateFile({ name: 'script.exe', size: 100 }))
  assert.ok(validateFile({ name: 'vide.pdf', size: 0 }))
  assert.ok(validateFile({ name: 'gros.mp4', size: MAX_FILE_SIZE + 1 }))
})
test('reordering cannot move past boundaries and leaves the source intact', () => {
  const source = ['A', 'B', 'C']
  assert.deepEqual(moveItem(source, 1, -1), ['B', 'A', 'C'])
  assert.deepEqual(moveItem(source, 0, -1), source)
  assert.deepEqual(moveItem(source, 2, 1), source)
  assert.deepEqual(source, ['A', 'B', 'C'])
})
