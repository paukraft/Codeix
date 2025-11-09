'use client'

import { appConfig } from '@/app-config'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuthOptions } from '@/hooks/use-auth-options'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  RiEyeLine,
  RiEyeOffLine,
  RiLockLine,
  RiMailLine,
} from '@remixicon/react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Logo from '../logo'

const formSchema = z.object({
  email: z
    .string()
    .email({
      message: 'Invalid email address',
    })
    .min(1, {
      message: 'Email is required',
    }),
  password: z
    .string()
    .min(8, {
      message: 'Password must be at least 8 characters long',
    })
    .refine((val) => /[A-Z]/.test(val), {
      message: 'Password must contain at least one uppercase letter',
    })
    .refine((val) => /[a-z]/.test(val), {
      message: 'Password must contain at least one lowercase letter',
    })
    .refine((val) => /\d/.test(val), {
      message: 'Password must contain at least one number',
    }),
})

export default function Signin() {
  const { authOptions, loadingProvider, error } = useAuthOptions()
  const [showPassword, setShowPassword] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Get email/password auth option
  const emailPasswordAuth = authOptions.find(
    (option) => option?.type === 'emailPassword',
  )

  // Get social auth options
  const socialAuthOptions = authOptions.filter(
    (option): option is NonNullable<typeof option> & { type: 'social' } =>
      option?.type === 'social',
  )

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (emailPasswordAuth?.handleSignIn) {
      await emailPasswordAuth.handleSignIn({
        email: data.email,
        password: data.password,
      })
    }
  }

  return (
    <section className="flex w-full flex-col items-center justify-center p-4 py-28 xl:px-6">
      <div className="flex w-full max-w-sm flex-col items-center">
        <Logo className="size-12 mb-4" />
        <h1 className="w-full text-center text-xl font-semibold text-balance">
          Welcome to {appConfig.appName}
        </h1>
        <p className="text-muted-foreground mt-1 w-full text-center text-sm">
          Want to create an account?{' '}
          <a href="/sign-up" className="underline underline-offset-2">
            Register
          </a>
        </p>

        {/* Display error message if any */}
        {error && (
          <div className="mt-4 w-full rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Email/Password Form - only show if email/password auth is enabled */}
        {emailPasswordAuth?.handleSignIn ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-8 w-full space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <div className="relative w-full">
                        <RiMailLine className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                        <Input
                          placeholder="myemail@company.com"
                          className="ps-8"
                          aria-invalid={!!fieldState.invalid}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <a
                        href="#"
                        className="text-sm font-medium hover:underline hover:underline-offset-4"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <FormControl>
                      <div className="relative w-full">
                        <RiLockLine className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                        <Input
                          placeholder="Password"
                          type={showPassword ? 'text' : 'password'}
                          className="ps-8 pe-9"
                          aria-invalid={!!fieldState.invalid}
                          {...field}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          type="button"
                          className="absolute top-1/2 right-0.5 h-8 w-8 -translate-y-1/2 cursor-pointer"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={loadingProvider === 'emailPassword'}
                disabled={loadingProvider !== null}
              >
                Continue with Email
              </Button>
            </form>
          </Form>
        ) : (
          <div className="mt-8" />
        )}

        {/* Divider - only show if we have both email/password and social options */}
        {emailPasswordAuth?.handleSignIn && socialAuthOptions.length > 0 && (
          <div className="after:border-border relative w-full py-4 text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Or
            </span>
          </div>
        )}

        {/* Social Auth Buttons - dynamically rendered */}
        {socialAuthOptions.length > 0 && (
          <div className="grid w-full grid-cols-1 gap-2">
            {socialAuthOptions.map((option) => (
              <Button
                key={option?.provider}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => option.handleSignIn()}
                isLoading={loadingProvider === option?.provider}
                disabled={loadingProvider !== null}
                icon={() => option?.icon}
              >
                Continue with {option?.label}
              </Button>
            ))}
          </div>
        )}

        <p className="text-muted-foreground mt-8 max-w-md text-center text-sm text-balance">
          By clicking continue, you agree to our{' '}
          <a href="#" className="underline underline-offset-2">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </section>
  )
}
