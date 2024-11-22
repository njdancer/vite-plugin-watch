import { PluginOption } from "vite"
import minimatch from "minimatch"
import path from "node:path"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

export const watch = (config: {
  pattern: string | string[]
  command: string | string[]
  silent?: boolean
  timeout?: number
  onInit?: boolean
  await?: boolean
}): PluginOption => {
  const options = {
    silent: false,
    timeout: 500,
    onInit: true,
    await: false,
    ...config,
  }

  let throttled = false

  const execute = async () => {
    await Promise.all(
      [options.command].flat().map(async (command) => {
        const { stdout, stderr } = await execAsync(command)

        if (!options.silent && stdout) console.log(stdout)
        if (!options.silent && stderr) console.error(stderr)
      })
    )
  }

  return {
    name: "vite-plugin-watch",

    buildStart() {
      if (options.onInit) {
        const executionPromise = execute()

        if (options.await) return executionPromise
      }
    },

    handleHotUpdate({ file, server }) {
      if (throttled) return

      throttled = true

      setTimeout(() => (throttled = false), options.timeout)

      const patterns = Array.of(options.pattern).flat()
      const shouldRun = patterns.find((pattern) =>
        minimatch(file, path.resolve(server.config.root, pattern).replaceAll("\\", "/"))
      )

      if (shouldRun) {
        console.info("Running", options.command, "\n")

        const executionPromise = execute()

        if (options.await) return executionPromise
      }
    },
  }
}
