import { getRepoFileTree } from '@/lib/e2b-helpers'
import { Sandbox } from '@e2b/code-interpreter'

import { stepkit } from 'stepkit'

const repoAnalyzer = stepkit<{ sandbox: Sandbox }>().step(
  'get-repo-structure',
  async ({ sandbox }) => {
    const fileTree = await getRepoFileTree({ sandbox })
    return { fileTree }
  },
)
