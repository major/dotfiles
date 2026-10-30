import { mkdir, open, rename, stat, unlink, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"

type Record<T> = {
  checkedAt: number
  value?: T
  error?: string
}

const LOCK_TIMEOUT_MS = 30_000

export async function loadUsageCache<T>(name: string, maxAgeMs: number, refresh: () => Promise<T>) {
  const directory = path.join(process.env.XDG_DATA_HOME ?? path.join(homedir(), ".local", "share"), "opencode", "usage")
  const file = path.join(directory, `${name}.json`)
  const cached = await read<T>(file)
  if (cached && Date.now() - cached.checkedAt < maxAgeMs) return cached

  const release = await lock(directory, name)
  if (!release) return cached
  try {
    const current = await read<T>(file)
    if (current && Date.now() - current.checkedAt < maxAgeMs) return current
    try {
      const value = await refresh()
      const next = { checkedAt: Date.now(), value } satisfies Record<T>
      await write(file, next)
      return next
    } catch (error) {
      const next = {
        checkedAt: Date.now(),
        ...(current?.value === undefined ? {} : { value: current.value }),
        error: error instanceof Error ? error.message : String(error),
      } satisfies Record<T>
      await write(file, next)
      return next
    }
  } finally {
    await release()
  }
}

async function read<T>(file: string) {
  try {
    const value = await Bun.file(file).json()
    if (typeof value !== "object" || value === null || !("checkedAt" in value) || typeof value.checkedAt !== "number")
      return undefined
    return value as Record<T>
  } catch {
    return undefined
  }
}

async function write<T>(file: string, value: Record<T>) {
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 })
  await rename(temporary, file)
}

async function lock(directory: string, name: string): Promise<(() => Promise<void>) | undefined> {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const file = path.join(directory, `${name}.lock`)
  try {
    const handle = await open(file, "wx", 0o600)
    return async () => {
      await handle.close()
      await unlink(file).catch(() => undefined)
    }
  } catch (error) {
    if (!(error instanceof Error) || !((error as NodeJS.ErrnoException).code === "EEXIST")) throw error
  }

  const info = await stat(file).catch(() => undefined)
  if (!info || Date.now() - info.mtimeMs <= LOCK_TIMEOUT_MS) return undefined
  await unlink(file).catch(() => undefined)
  return lock(directory, name)
}
