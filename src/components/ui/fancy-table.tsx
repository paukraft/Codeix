'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton-plus'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCloseCircleLine,
  RiFilter3Line,
  RiInboxLine,
  RiRefreshLine,
  RiSearch2Line,
} from '@remixicon/react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

interface SearchInputProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  icon?: ReactNode
  className?: string
  'aria-label'?: string
}

const SearchInput = ({
  placeholder,
  value,
  onChange,
  icon = <RiSearch2Line size={20} aria-hidden="true" />,
  className,
  'aria-label': ariaLabel,
}: SearchInputProps) => {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative">
      <Input
        id={`${id}-input`}
        ref={inputRef}
        className={cn(
          'peer ps-9 bg-background',
          Boolean(value) && 'pe-9',
          className,
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="text"
        aria-label={ariaLabel || placeholder}
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/60 peer-disabled:opacity-50">
        {icon}
      </div>
      {Boolean(value) && (
        <button
          className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/60 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Clear filter"
          onClick={() => {
            onChange('')
            if (inputRef.current) {
              inputRef.current.focus()
            }
          }}
        >
          <RiCloseCircleLine size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface StatusFilterProps {
  options: FilterOption[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  title?: string
}

const StatusFilter = ({
  options,
  selectedValues,
  onSelectionChange,
  title = 'Status',
}: StatusFilterProps) => {
  const id = useId()

  const handleChange = (checked: boolean, value: string) => {
    const newValues = checked
      ? [...selectedValues, value]
      : selectedValues.filter((v) => v !== value)

    onSelectionChange(newValues.length ? newValues : [])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <RiFilter3Line
            className="size-5 -ms-1.5 text-muted-foreground/60"
            size={20}
            aria-hidden="true"
          />
          Filter
          {selectedValues.length > 0 && (
            <span className="-me-1 ms-3 inline-flex h-5 max-h-full items-center rounded border border-border bg-background px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
              {selectedValues.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-36 p-3" align="end">
        <div className="space-y-3">
          <div className="text-xs font-medium uppercase text-muted-foreground/60">
            {title}
          </div>
          <div className="space-y-3">
            {options.map((option, i) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${id}-${i}`}
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked: boolean) =>
                    handleChange(checked, option.value)
                  }
                />
                <Label
                  htmlFor={`${id}-${i}`}
                  className="flex grow justify-between gap-2 font-normal"
                >
                  {option.label}
                  {option.count !== undefined && (
                    <span className="ms-2 text-xs text-muted-foreground">
                      {option.count}
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface EmptyStateConfig {
  icon?: ReactNode
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?:
      | 'default'
      | 'outline'
      | 'secondary'
      | 'ghost'
      | 'link'
      | 'destructive'
  }
}

const EmptyState = ({ config }: { config?: EmptyStateConfig }) => {
  const defaultIcon = (
    <RiInboxLine size={48} className="text-muted-foreground/40" />
  )
  const defaultTitle = 'No data found'
  const defaultDescription = 'There are no items to display at the moment.'

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="mb-4 flex items-center justify-center">
        {config?.icon || defaultIcon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {config?.title || defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {config?.description || defaultDescription}
      </p>
      {config?.action && (
        <Button
          onClick={config.action.onClick}
          variant={config.action.variant || 'default'}
        >
          {config.action.label}
        </Button>
      )}
    </div>
  )
}

interface FancyTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  isLoading?: boolean
  searchConfig?: {
    column: string
    placeholder: string
    className?: string
    icon?: ReactNode
  }
  additionalSearchInputs?: Array<{
    column: string
    placeholder: string
    icon?: ReactNode
    className?: string
  }>
  filterConfig?: {
    column: string
    options: FilterOption[]
    title?: string
    getLabel?: (value: string) => string
  }
  defaultSorting?: SortingState
  actions?: ReactNode
  emptyState?: EmptyStateConfig
  /**
   * Called whenever the table's column filters change so the parent can perform
   * server-side filtering. Receives the full ColumnFiltersState array.
   */
  onFiltersChange?: (filters: ColumnFiltersState) => void

  /**
   * Called whenever the table's sorting changes so the parent can perform
   * server-side sorting.
   */
  onSortingChange?: (sorting: SortingState) => void

  /**
   * Infinite scroll configuration – if provided, the table will observe the
   * sentinel row at the bottom and call fetchNextPage when it becomes visible.
   */
  infiniteConfig?: {
    fetchNextPage: () => void
    hasNextPage?: boolean
    isFetchingNextPage?: boolean
  }
}

export const FancyTable = <TData,>({
  data,
  columns,
  isLoading = false,
  searchConfig,
  additionalSearchInputs = [],
  filterConfig,
  defaultSorting = [],
  actions,
  emptyState,
  onFiltersChange,
  onSortingChange,
  infiniteConfig,
}: FancyTableProps<TData>) => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>(defaultSorting)

  // Sentinel logic for infinite scrolling
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!infiniteConfig?.hasNextPage) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver((entries) => {
      const config = infiniteConfig
      if (!config) return
      if (entries[0]?.isIntersecting && !config.isFetchingNextPage) {
        config.fetchNextPage()
      }
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infiniteConfig?.hasNextPage, infiniteConfig?.isFetchingNextPage])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater(sorting)
        setSorting(newState)
        onSortingChange?.(newState)
      } else {
        setSorting(updater)
        onSortingChange?.(updater)
      }
    },
    enableSortingRemoval: false,
    onColumnFiltersChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater(columnFilters)
        setColumnFilters(newState)
        onFiltersChange?.(newState)
      } else {
        setColumnFilters(updater)
        onFiltersChange?.(updater)
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  // Filter configuration
  const filterColumn = filterConfig
    ? table.getColumn(filterConfig.column)
    : null
  const filterFacetedValues = filterColumn?.getFacetedUniqueValues()
  const filterValue = filterColumn?.getFilterValue() as string[] | undefined

  const filterOptions = useMemo(() => {
    if (!filterConfig || !filterColumn) return []

    if (filterConfig.options.length > 0) {
      // Use provided options with counts from faceted values
      return filterConfig.options.map((option) => ({
        ...option,
        count: filterFacetedValues?.get(option.value) || 0,
      }))
    }

    // Generate options from faceted values
    const values = Array.from(filterFacetedValues?.keys() ?? [])
    return values.sort().map((value) => ({
      value,
      label: filterConfig.getLabel?.(value) || value,
      count: filterFacetedValues?.get(value) || 0,
    }))
  }, [filterConfig, filterColumn, filterFacetedValues])

  const selectedFilterValues = useMemo(() => {
    return filterValue ?? []
  }, [filterValue])

  const handleFilterChange = (values: string[]) => {
    filterColumn?.setFilterValue(values.length ? values : undefined)
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      {(searchConfig ||
        additionalSearchInputs.length > 0 ||
        filterConfig ||
        actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left side - Search inputs */}
          <div className="flex items-center gap-3">
            {searchConfig && (
              <SearchInput
                placeholder={searchConfig.placeholder}
                value={
                  (table.getColumn(searchConfig.column)?.getFilterValue() ??
                    '') as string
                }
                onChange={(value) =>
                  table.getColumn(searchConfig.column)?.setFilterValue(value)
                }
                icon={searchConfig.icon}
                className={cn(
                  'min-w-60 bg-gradient-to-br from-accent/60 to-accent',
                  searchConfig.className,
                )}
                aria-label={searchConfig.placeholder}
              />
            )}

            {additionalSearchInputs.map((input, index) => (
              <SearchInput
                key={index}
                placeholder={input.placeholder}
                value={
                  (table.getColumn(input.column)?.getFilterValue() ??
                    '') as string
                }
                onChange={(value) =>
                  table.getColumn(input.column)?.setFilterValue(value)
                }
                icon={input.icon}
                className={cn('min-w-48', input.className)}
                aria-label={input.placeholder}
              />
            ))}
          </div>

          {/* Right side - Filters and actions */}
          <div className="flex items-center gap-3">
            {filterConfig && (
              <StatusFilter
                options={filterOptions}
                selectedValues={selectedFilterValues}
                onSelectionChange={handleFilterChange}
                title={filterConfig.title}
              />
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Table */}
      <Table
        className={cn(
          'table-fixed border-separate border-spacing-0 [&_tr:not(:last-child)_td]:border-b',
          isLoading && 'overflow-hidden',
        )}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className="relative h-9 select-none bg-sidebar border-y border-border first:border-l first:rounded-l-lg last:border-r last:rounded-r-lg"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        className={cn(
                          header.column.getCanSort() &&
                            'flex h-full cursor-pointer select-none items-center gap-2',
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          if (
                            header.column.getCanSort() &&
                            (e.key === 'Enter' || e.key === ' ')
                          ) {
                            e.preventDefault()
                            header.column.getToggleSortingHandler()?.(e)
                          }
                        }}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: (
                            <RiArrowUpSLine
                              className="shrink-0 opacity-60"
                              size={16}
                              aria-hidden="true"
                            />
                          ),
                          desc: (
                            <RiArrowDownSLine
                              className="shrink-0 opacity-60"
                              size={16}
                              aria-hidden="true"
                            />
                          ),
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <tbody aria-hidden="true" className="table-row h-1"></tbody>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow
                key={index}
                className="hover:bg-transparent [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
              >
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex} className="h-12">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows?.length ? (
            <>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-0 [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg h-px hover:bg-accent/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="last:py-0 h-[inherit] overflow-hidden"
                    >
                      <div className="min-w-0">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {/* Removed sentinel <TableRow>. It will be rendered outside the table to avoid extra borders. */}
            </>
          ) : (
            <TableRow className="hover:bg-transparent [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg">
              <TableCell colSpan={columns.length} className="p-0">
                <EmptyState config={emptyState} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <tbody aria-hidden="true" className="table-row h-1"></tbody>
      </Table>

      {/* Sentinel element for infinite scrolling – placed outside the table so it doesn't affect row borders */}
      {infiniteConfig && (
        <div
          ref={sentinelRef}
          className="h-10 flex items-center justify-center"
        >
          {infiniteConfig.isFetchingNextPage ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {infiniteConfig.hasNextPage ? 'Load more…' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Export utility components for custom use
export { EmptyState, SearchInput, StatusFilter }

// Export utility functions for common table patterns
export const createTableActions = (children: ReactNode) => (
  <div className="flex items-center gap-3">{children}</div>
)

export const createRefreshButton = ({
  onClick,
  isLoading,
}: {
  onClick: () => void
  isLoading?: boolean
}) => (
  <Button
    onClick={onClick}
    icon={RiRefreshLine}
    isLoading={isLoading}
    size="icon"
    variant="outline"
  />
)

// Export type for EmptyStateConfig for external use
export type { EmptyStateConfig }
