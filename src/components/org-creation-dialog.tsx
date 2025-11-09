'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { appConfig } from '@/app-config'
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
import { authClient } from '@/lib/auth-client'
import { slugifyer } from '@/lib/slugifyer'
import { RiCloseLine, RiTeamLine } from '@remixicon/react'

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

type OrganizationCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  onSuccess?: () => void
}

export const OrganizationCreateDialog = ({
  open,
  onOpenChange,
  trigger,
  onSuccess,
}: OrganizationCreateDialogProps) => {
  const [isCreating, setIsCreating] = useState(false)
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [currentSlug, setCurrentSlug] = useState('')
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  })

  const organizationName = form.watch('name')

  // Debounced slug checking
  useEffect(() => {
    if (!organizationName || organizationName.length < 2) {
      setSlugAvailable(null)
      setCurrentSlug('')
      return
    }

    const slug = slugifyer(organizationName)
    setCurrentSlug(slug)

    const timeoutId = setTimeout(() => {
      void (async () => {
        setIsCheckingSlug(true)
        try {
          const { data, error } = await authClient.organization.checkSlug({
            slug,
          })

          if (error) {
            console.log('Slug check error:', error)
            // Check if the error indicates the slug is taken
            if (
              error.code === 'SLUG_IS_TAKEN' ||
              error.message?.includes('taken')
            ) {
              setSlugAvailable(false)
            } else {
              // Other errors (network, etc.) - treat as unknown
              setSlugAvailable(null)
            }
          } else {
            // The API returns { status: boolean } where true means available
            console.log('Slug check result:', data)
            setSlugAvailable(data?.status === true)
          }
        } catch (error) {
          console.error('Failed to check slug availability:', error)
          setSlugAvailable(null)
        } finally {
          setIsCheckingSlug(false)
        }
      })()
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [organizationName])

  const handleCreateOrganization = async (
    values: z.infer<typeof formSchema>,
  ) => {
    setIsCreating(true)

    try {
      // Generate slug from organization name
      const slug = slugifyer(values.name)

      // Double-check slug availability before creating
      const { data: slugCheck, error: slugError } =
        await authClient.organization.checkSlug({
          slug,
        })

      if (slugError || !slugCheck?.status) {
        toast.error(
          'Organization name is no longer available. Please choose a different name.',
        )
        setIsCreating(false)
        return
      }

      const { error } = await authClient.organization.create({
        name: values.name,
        slug,
      })

      if (error) {
        toast.error(error.message)
        setIsCreating(false)
        onOpenChange(false)
        return
      }

      toast.success('Team created successfully!')

      router.push(appConfig.getBaseOrgPath(slug))

      // Reset and close the dialog
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create organization:', error)

      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : undefined
      if (errorMessage) {
        // Better Auth typically provides meaningful error messages
        if (
          errorMessage.includes('slug') ||
          errorMessage.includes('already exists')
        ) {
          toast.error(
            'A team with this name already exists. Please choose a different name.',
          )
        } else if (
          errorMessage.includes('permission') ||
          errorMessage.includes('unauthorized')
        ) {
          toast.error('You do not have permission to create teams.')
        } else if (
          errorMessage.includes('limit') ||
          errorMessage.includes('quota')
        ) {
          toast.error('You have reached the maximum number of teams.')
        } else {
          toast.error(`Failed to create team: ${errorMessage}`)
        }
      } else {
        toast.error('Failed to create team. Please try again.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const getSlugStatusMessage = () => {
    if (!currentSlug) return null

    // Only show negative state - when slug is taken
    if (slugAvailable === false) {
      return (
        <div className="flex items-center gap-2 text-sm text-red-600 font-medium bg-red-50 dark:bg-red-950/20 p-2 rounded-md border border-red-200 dark:border-red-800">
          <RiCloseLine className="size-4 text-red-600 flex-shrink-0" />
          <span>Not available - try a different name</span>
        </div>
      )
    }

    // For all other states (checking, available, or unknown), show nothing
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <div className="flex flex-col gap-2">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            <RiTeamLine className="opacity-80" size={16} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-left">Create Team</DialogTitle>
            <DialogDescription className="text-left">
              Create a new team to collaborate with your colleagues and manage
              your email infrastructure.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreateOrganization)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  {getSlugStatusMessage()}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isCreating}
                disabled={isCreating || slugAvailable !== true}
              >
                Create Team
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
