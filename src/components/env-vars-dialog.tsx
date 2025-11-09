'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/trpc/react'
import { RiAddLine, RiCloseLine, RiUploadLine } from '@remixicon/react'
import { useState } from 'react'
import { toast } from 'sonner'

type EnvVar = {
  key: string
  value: string
}

export const EnvVarsDialog = ({
  sessionId,
  orgSlug,
}: {
  sessionId: string
  orgSlug: string
}) => {
  const [open, setOpen] = useState(false)
  const [envVars, setEnvVars] = useState<EnvVar[]>([{ key: '', value: '' }])

  const uploadEnvVars = api.agentSession.uploadEnvVars.useMutation({
    onSuccess: () => {
      toast.success('Environment variables uploaded to sandbox')
      setOpen(false)
      setEnvVars([{ key: '', value: '' }])
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to upload environment variables')
    },
  })

  const parseEnvFile = (text: string): EnvVar[] => {
    const result: EnvVar[] = []
    const lines = text.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue

      // Find first = that's not in quotes
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue

      const key = trimmed.slice(0, eqIndex).trim()
      let value = trimmed.slice(eqIndex + 1).trim()

      // Remove surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (key) result.push({ key, value })
    }

    return result
  }

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    const pastedText = e.clipboardData.getData('text')

    // Check if it looks like .env format (multiple lines with = or single line with =)
    const hasMultipleLines = pastedText.includes('\n')
    const hasEquals = pastedText.includes('=')

    if (hasEquals && (hasMultipleLines || pastedText.split('=').length === 2)) {
      e.preventDefault()

      const parsed = parseEnvFile(pastedText)
      if (parsed.length > 0) {
        // Replace current row and add new ones
        const newVars = [...envVars]
        newVars[index] = parsed[0]!
        
        // Add remaining parsed vars
        for (let i = 1; i < parsed.length; i++) {
          newVars.splice(index + i, 0, parsed[i]!)
        }

        setEnvVars(newVars)
        toast.success(`Imported ${parsed.length} variable${parsed.length > 1 ? 's' : ''}`)
      }
    }
  }

  const handleUpload = () => {
    const filtered = envVars.filter((ev) => ev.key.trim())
    if (filtered.length === 0) {
      toast.error('Please add at least one environment variable')
      return
    }

    const payload = filtered.map((ev) => ({
      key: ev.key.trim(),
      value: ev.value,
    }))

    uploadEnvVars.mutate({
      sessionId,
      orgSlug,
      envVars: payload,
    })
  }

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }])
  }

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index))
  }

  const updateEnvVar = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars]
    updated[index]![field] = val
    setEnvVars(updated)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RiUploadLine />
          Env Vars
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Environment Variables</DialogTitle>
          <DialogDescription>
            Add variables one at a time, or paste .env content to auto-import
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {envVars.map((envVar, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  placeholder="KEY"
                  value={envVar.key}
                  onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                  onPaste={(e) => handlePaste(e, index)}
                  className="font-mono"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="value"
                  value={envVar.value}
                  onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                  className="font-mono"
                />
              </div>
              {envVars.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEnvVar(index)}
                  className="shrink-0"
                >
                  <RiCloseLine />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={addEnvVar}
          className="w-full"
        >
          <RiAddLine />
          Add Variable
        </Button>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={uploadEnvVars.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            isLoading={uploadEnvVars.isPending}
            disabled={uploadEnvVars.isPending}
          >
            <RiUploadLine />
            Upload to Sandbox
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

