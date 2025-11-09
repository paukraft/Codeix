import { MobileSidebarTrigger } from './mobile-sidebar-trigger'

export const AppLayout = ({
  children,
  header,
}: {
  children?: React.ReactNode
  header?: {
    title?: React.ReactNode
    description?: React.ReactNode
    actions?: React.ReactNode
  }
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto">
      {header && (
        <div className="flex items-center justify-between mb-8 gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <MobileSidebarTrigger />
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl sm:text-4xl font-bold">{header.title}</h1>
              {header.description && (
                <span className="text-base text-muted-foreground md:max-w-2xl">
                  {header.description}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">{header.actions}</div>
        </div>
      )}
      {children}
    </div>
  )
}
