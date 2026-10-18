import { useState } from 'react'
export function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`cours:v2:${key}`)) ?? fallback
  } catch {
    return fallback
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(`cours:v2:${key}`, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => readLocal(key, initial))
  const [stored, setStored] = useState(true)
  function update(next) {
    const resolved = typeof next === 'function' ? next(value) : next
    setStored(writeLocal(key, resolved))
    setValue(resolved)
  }
  return [value, update, stored]
}
export function rememberClass(classe) {
  const previous = readLocal('classes', []),
    safe = Array.isArray(previous) ? previous : []
  return writeLocal(
    'classes',
    [
      { slug: classe.slug, libelle: classe.libelle, matiere: classe.matiere },
      ...safe.filter((c) => c.slug !== classe.slug),
    ].slice(0, 6),
  )
}
