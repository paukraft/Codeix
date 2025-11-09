import { Template } from 'e2b'

export const template = Template()
  .fromImage('e2bdev/base')
  // Install git
  .runCmd('sudo apt-get update && sudo apt-get install -y git ripgrep')
  // Install bun
  .runCmd('curl -fsSL https://bun.sh/install | bash')
  // Add bun to PATH in .bashrc for interactive shells
  .runCmd('echo \'export PATH="$HOME/.bun/bin:$PATH"\' >> ~/.bashrc')
  // Add bun to PATH in .profile for non-interactive shells (used by commands.run)
  .runCmd('echo \'export PATH="$HOME/.bun/bin:$PATH"\' >> ~/.profile')
  // Also add to current session for verification
  .runCmd(
    'export PATH="$HOME/.bun/bin:$PATH" && git --version && bun --version',
  )
