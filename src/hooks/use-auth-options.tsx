'use client'

import { appConfig } from '@/app-config'
import { authClient } from '@/lib/auth-client'
import { useState } from 'react'

export const useAuthOptions = () => {
  const [loadingProvider, setLoadingProvider] = useState<
    keyof typeof authProviders | null
  >(null)
  const [error, setError] = useState('')

  const authProviders = {
    emailPassword: {
      signIn: {
        handle: async ({
          email,
          password,
        }: {
          email: string
          password: string
        }) => {
          setLoadingProvider('emailPassword')
          setError('')

          try {
            await authClient.signIn.email(
              {
                email,
                password,
                callbackURL: appConfig.baseSignedInPath,
              },
              {
                onError: (ctx: any) => {
                  setError(ctx.error.message)
                },
              },
            )
          } catch (err) {
            console.error(err)
            setError('An unexpected error occurred')
          } finally {
            setLoadingProvider(null)
          }
        },
      },
      signUp: {
        handle: async ({
          email,
          password,
        }: {
          email: string
          password: string
        }) => {
          setLoadingProvider('emailPassword')
          setError('')

          try {
            await authClient.signUp.email(
              {
                email,
                password,
                name: email.split('@')[0] || 'User',
                callbackURL: appConfig.baseSignedInPath,
              },
              {
                onError: (ctx: any) => {
                  setError(ctx.error.message)
                },
              },
            )
          } catch (err) {
            console.error(err)
            setError('An unexpected error occurred')
          } finally {
            setLoadingProvider(null)
          }
        },
      },
      type: 'emailPassword',
    },
    google: {
      icon: (
        <svg
          viewBox="0 0 256 262"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid"
        >
          <path
            d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
            fill="#4285F4"
          />
          <path
            d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
            fill="#34A853"
          />
          <path
            d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
            fill="#FBBC05"
          />
          <path
            d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
            fill="#EB4335"
          />
        </svg>
      ),
      type: 'social',
      label: 'Google',
    },
    github: {
      icon: (
        <svg
          viewBox="0 0 1024 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
            transform="scale(64)"
            fill="currentColor"
          />
        </svg>
      ),
      type: 'social',
      label: 'GitHub',
    },
    discord: {
      icon: (
        <svg
          stroke="currentColor"
          fill="#5865F2"
          stroke-width="0"
          viewBox="0 0 640 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"></path>
        </svg>
      ),
      type: 'social',
      label: 'Discord',
    },
  } as const

  const enabledAuthOptions: Partial<Record<keyof typeof authProviders, any>> = {
    emailPassword: {
      signIn: true,
      signUp: true,
    },
  }

  const authOptions = (
    Object.keys(enabledAuthOptions) as Array<keyof typeof enabledAuthOptions>
  )
    .map((key) => {
      const provider = authProviders[key]
      const value = enabledAuthOptions[key]

      if (provider.type === 'emailPassword') {
        const signInEnabled = value.signIn === true
        const signUpEnabled = value.signUp === true
        return {
          handleSignIn: signInEnabled ? provider.signIn.handle : undefined,
          handleSignUp: signUpEnabled ? provider.signUp.handle : undefined,
          type: provider.type,
          provider: key,
        }
      }

      if (provider.type === 'social') {
        const enabled = value === true

        if (!enabled) return undefined

        const handleSignIn = async () => {
          try {
            setLoadingProvider(key)
            await authClient.signIn.social({
              provider: key,
              callbackURL: appConfig.baseSignedInPath,
            })
          } catch (error) {
            console.error('Login failed:', error)
          } finally {
            setLoadingProvider(null)
          }
        }

        return {
          handleSignIn,
          type: 'social',
          provider: key,
          label: provider.label,
          icon: provider.icon,
        }
      }

      return provider
    })
    .filter(Boolean)

  return {
    loadingProvider,
    error,
    authOptions,
  }
}
