import type { StudioProject } from './types'

const KEY = 'cineverse.theater-studio.projects.v1'
const read = (): StudioProject[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as StudioProject[] } catch { return [] } }
const write = (projects: StudioProject[]) => localStorage.setItem(KEY, JSON.stringify(projects))

export const studioRepository = {
  list: read,
  saveDraft(project: StudioProject) {
    if (project.status === 'published') throw new Error('Published versions are immutable. Create a draft first.')
    const next = read().filter(item => item.versionId !== project.versionId)
    const saved = { ...project, updatedAt: new Date().toISOString() }
    write([saved, ...next]); return saved
  },
  publish(project: StudioProject) {
    const published = { ...project, status: 'published' as const, updatedAt: new Date().toISOString() }
    const next = read().filter(item => item.versionId !== project.versionId)
    write([published, ...next]); return published
  },
  newDraft(project: StudioProject) {
    const now = new Date().toISOString()
    return { ...project, versionId: `${project.id}-v${project.version + 1}-${Date.now()}`, version: project.version + 1, status: 'draft' as const, createdAt: now, updatedAt: now, config: { ...project.config, revision: 'custom-pending', preset: 'custom' as const } }
  },
}

const DB = 'cineverse-studio-assets'; const STORE = 'assets'
export function storeAsset(id: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => { const request = indexedDB.open(DB, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE); request.onerror = () => reject(request.error); request.onsuccess = () => { const tx = request.result.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(file, id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) } })
}
