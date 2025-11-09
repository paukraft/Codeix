import slugify from 'slugify'

export const slugifyer = (
  str: string,
  options?: Exclude<Parameters<typeof slugify>[1], string>
) => {
  return slugify(str, {
    lower: true,
    strict: true,
    ...options,
  })
}
