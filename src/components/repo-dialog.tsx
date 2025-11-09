'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useOrg } from '@/hooks/use-org'
import { api } from '@/trpc/react'
import { RiGitRepositoryLine } from '@remixicon/react'

const repositoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z
    .string()
    .url('Invalid URL')
    .refine(
      (url) => /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/.test(url),
      'Must be a valid GitHub repository URL (https://github.com/owner/repo)',
    ),
})

type RepositoryFormValues = z.infer<typeof repositoryFormSchema>

type RepoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  repository?: { id: string; name: string; url: string }
  onSuccess?: () => void
}

export const RepoDialog = ({
  open,
  onOpenChange,
  trigger,
  repository,
  onSuccess,
}: RepoDialogProps) => {
  const { orgSlug } = useOrg()

  const form = useForm<RepositoryFormValues>({
    resolver: zodResolver(repositoryFormSchema),
    defaultValues: {
      name: '',
      url: '',
    },
  })

  // Reset form when repository changes or dialog opens/closes
  useEffect(() => {
    if (open && repository) {
      form.reset({
        name: repository.name,
        url: repository.url,
      })
    } else if (!open) {
      form.reset({
        name: '',
        url: '',
      })
    }
  }, [open, repository, form])

  const utils = api.useUtils()

  const createMutation = api.repository.create.useMutation({
    onSuccess: () => {
      void utils.repository.list.invalidate({ orgSlug })
      onOpenChange(false)
      form.reset()
      toast.success('Repository added successfully')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = api.repository.update.useMutation({
    onSuccess: () => {
      void utils.repository.list.invalidate({ orgSlug })
      onOpenChange(false)
      toast.success('Repository updated successfully')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: RepositoryFormValues) => {
    if (repository) {
      updateMutation.mutate({
        orgSlug,
        id: repository.id,
        ...values,
      })
    } else {
      createMutation.mutate({
        orgSlug,
        ...values,
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <div className="flex flex-col gap-2">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border">
            <RiGitRepositoryLine className="opacity-80" size={16} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-left">
              {repository ? 'Edit Repository' : 'Add Repository'}
            </DialogTitle>
            <DialogDescription className="text-left">
              {repository
                ? 'Update repository details.'
                : 'Connect a public GitHub repository by entering its URL.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/owner/repo"
                      type="url"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Repository name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {repository ? 'Update Repository' : 'Add Repository'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

