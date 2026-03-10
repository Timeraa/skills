export interface VendorSkillMeta {
  official?: boolean
  source: string
  skills: Record<string, string>
}

/**
 * Repositories to clone as submodules and generate skills from source
 */
export const submodules = {
  wxt: 'https://github.com/wxt-dev/wxt',
  'webext-core': 'https://github.com/aklinker1/webext-core',
}

/**
 * Already generated skills, sync with their `skills/` directory
 */
export const vendors: Record<string, VendorSkillMeta> = {}

/**
 * Hand-written skills
 */
export const manual: string[] = []
