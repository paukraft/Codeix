export const ALLOWED_MODELS = [
  { value: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
  { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
  { value: 'openai/gpt-5-codex', label: 'GPT-5 Codex' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
] as const

export const ALLOWED_MODEL_VALUES = ALLOWED_MODELS.map((m) => m.value)

export type AllowedModelValue = (typeof ALLOWED_MODEL_VALUES)[number]

export const DEFAULT_MODEL = ALLOWED_MODELS[0].value

export const isValidModel = (
  model: string,
): model is (typeof ALLOWED_MODEL_VALUES)[number] => {
  return (ALLOWED_MODEL_VALUES as readonly string[]).includes(model)
}
