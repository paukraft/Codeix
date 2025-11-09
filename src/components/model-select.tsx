'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ALLOWED_MODELS,
  DEFAULT_MODEL,
  isValidModel,
} from '@/lib/models'
import { useLocalStorage } from 'usehooks-ts'

export const ModelSelect = () => {
  const [storedModel, setStoredModel] = useLocalStorage<string>(
    'chat-model',
    DEFAULT_MODEL,
  )
  const model = isValidModel(storedModel) ? storedModel : DEFAULT_MODEL

  return (
    <Select
      value={model}
      onValueChange={(value) => {
        if (isValidModel(value)) {
          setStoredModel(value)
        }
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALLOWED_MODELS.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

