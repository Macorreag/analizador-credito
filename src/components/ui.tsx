import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { formatCOP } from '../lib/format';
import { AlertIcon, CheckIcon, InfoIcon } from './icons';

export function Card({
  children,
  className = '',
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return <div className={`card ${glow ? 'card--glow' : ''} ${className}`.trim()}>{children}</div>;
}

export function SectionHead({
  kicker,
  title,
  description,
  actions,
  id,
}: {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <div className="section-head">
      <div>
        {kicker ? <div className="section-kicker">{kicker}</div> : null}
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {description ? <p className="section-desc">{description}</p> : null}
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  tone = 'default',
  title,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'teal' | 'gold' | 'rust';
  title?: string;
}) {
  return (
    <div className="kpi" title={title}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${tone !== 'default' ? `kpi-value--${tone}` : ''}`.trim()}>
        {value}
      </div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'teal' | 'gold' | 'rust';
  title?: string;
}) {
  return (
    <span className={`badge ${tone !== 'neutral' ? `badge--${tone}` : ''}`.trim()} title={title}>
      {children}
    </span>
  );
}

export function Callout({
  tone = 'neutral',
  title,
  children,
  icon,
}: {
  tone?: 'neutral' | 'teal' | 'gold' | 'rust';
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const defaultIcon =
    tone === 'rust' ? (
      <AlertIcon size={16} />
    ) : tone === 'teal' ? (
      <CheckIcon size={16} />
    ) : (
      <InfoIcon size={16} />
    );
  return (
    <div className={`callout ${tone !== 'neutral' ? `callout--${tone}` : ''}`.trim()} role="note">
      {icon ?? defaultIcon}
      <div>
        {title ? <span className="callout-title">{title}</span> : null}
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  action,
  children,
  className = '',
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${className}`.trim()}>
      <label className="field-label" htmlFor={htmlFor}>
        <span>{label}</span>
        {action}
      </label>
      {children}
      {hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  prefix?: string;
  suffix?: string;
  blankZero?: boolean;
}

export function NumberInput({
  value,
  onChange,
  invalid = false,
  prefix,
  suffix,
  blankZero = false,
  className = '',
  ...rest
}: NumberInputProps) {
  const display = !Number.isFinite(value) ? '' : value === 0 && blankZero ? '' : value;
  const input = (
    <input
      type="number"
      className={`input ${className}`.trim()}
      value={display}
      onChange={(event) => {
        const next = event.target.value === '' ? 0 : Number(event.target.value);
        onChange(Number.isFinite(next) ? next : 0);
      }}
      onFocus={(event) => event.currentTarget.select()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );

  if (!prefix && !suffix) return input;

  return (
    <div
      className={`input-wrap ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`.trim()}
    >
      {prefix ? <span className="input-prefix">{prefix}</span> : null}
      {input}
      {suffix ? <span className="input-suffix">{suffix}</span> : null}
    </div>
  );
}

export function MoneyInput({
  value,
  onChange,
  invalid,
  blankZero = true,
  step = 100_000,
  ...rest
}: Omit<NumberInputProps, 'prefix'>) {
  const id = useId();
  return (
    <>
      <NumberInput
        id={id}
        prefix="$"
        value={value}
        onChange={onChange}
        invalid={invalid}
        blankZero={blankZero}
        step={step}
        min={0}
        {...rest}
      />
      <span className="formatted-hint">{formatCOP(value)}</span>
    </>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={`segmented ${className}`.trim()} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon ? <div className="empty-icon">{icon}</div> : null}
      <div className="empty-title">{title}</div>
      {children ? <p className="empty-text">{children}</p> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}
