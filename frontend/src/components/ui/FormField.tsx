import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const base = 'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/** Accessible label + control + error wiring. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId()
  const msgId = `${id}-msg`
  const describedBy = error || hint ? msgId : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <p id={msgId} role="alert" className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={msgId} className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextProps extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; hint?: string; trailing?: ReactNode }

export const TextField = forwardRef<HTMLInputElement, TextProps>(function TextField({ label, error, hint, trailing, className = '', ...rest }, ref) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input ref={ref} id={id} aria-invalid={invalid} aria-describedby={describedBy}
            className={`${base} ${invalid ? 'border-red-400' : 'border-slate-300'} ${trailing ? 'pr-10' : ''} ${className}`} {...rest} />
          {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>}
        </div>
      )}
    </Field>
  )
})

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label: string; error?: string; hint?: string }
export const TextAreaField = forwardRef<HTMLTextAreaElement, AreaProps>(function TextAreaField({ label, error, hint, ...rest }, ref) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <textarea ref={ref} id={id} rows={3} aria-invalid={invalid} aria-describedby={describedBy}
          className={`${base} ${invalid ? 'border-red-400' : 'border-slate-300'}`} {...rest} />
      )}
    </Field>
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label: string; error?: string; hint?: string }
export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField({ label, error, hint, children, ...rest }, ref) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <select ref={ref} id={id} aria-invalid={invalid} aria-describedby={describedBy}
          className={`${base} ${invalid ? 'border-red-400' : 'border-slate-300'}`} {...rest}>{children}</select>
      )}
    </Field>
  )
})

/** Compact select/input for filter bars (visually hidden label keeps it accessible). */
export function FilterSelect({ label, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select aria-label={label} className={`${base} border-slate-300`} {...rest}>{children}</select>
    </label>
  )
}
