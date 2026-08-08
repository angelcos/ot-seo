import Image from "next/image";
import Link from "next/link";
import { forwardRef, useMemo, useState } from "react";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const industrialClipPaths = {
  headerLogo: "polygon(0 0, 100% 0, calc(100% - 24px) 100%, 0 100%)",
  headerTitle: "polygon(24px 0, 100% 0, calc(100% - 24px) 100%, 0 100%)",
  headerActions: "polygon(24px 0, 100% 0, 100% 100%, 0 100%)",
} as const;

export const industrialTabGeometry = {
  firstClipPath: "polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
  middleClipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
  endCapClipPath: "polygon(12px 0, 100% 0, 100% 100%, 0 100%)",
  overlap: "-6px",
} as const;

export const industrialClasses = {
  headerActionControl:
    "border border-white/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-white/20",
  panel: "border border-[#CCCCCC]",
  emptyState:
    "border border-dashed border-[#CCCCCC] bg-[#F0F0F0] px-4 py-8 text-center text-sm text-slate-500",
} as const;

type IndustrialHeaderProps = {
  title: string;
  actions: ReactNode;
  className?: string;
  titleClassName?: string;
  actionsClassName?: string;
};

export function IndustrialHeader({
  title,
  actions,
  className,
  titleClassName,
  actionsClassName,
}: IndustrialHeaderProps) {
  return (
    <header className={cx("flex h-16 overflow-hidden gap-px bg-[#CCCCCC] md:h-20", className)}>
      <div
        className="relative z-10 flex shrink-0 items-center bg-white px-4"
        style={{ clipPath: industrialClipPaths.headerLogo, paddingRight: "44px" }}
      >
        <Image src="/seo-logo.png" alt="SEO Mecánica" width={140} height={40} loading="eager" className="h-full w-auto object-contain py-2" />
      </div>
      <div
        className="relative flex flex-1 items-center bg-[#33353A] px-5"
        style={{ clipPath: industrialClipPaths.headerTitle, paddingLeft: "38px", paddingRight: "38px" }}
      >
        <h1 className={cx("text-base font-bold uppercase tracking-widest text-white md:text-lg", titleClassName)}>{title}</h1>
      </div>
      <div
        className={cx("relative z-10 flex shrink-0 items-center bg-[#B81318] px-4 md:px-5", actionsClassName)}
        style={{ clipPath: industrialClipPaths.headerActions, paddingLeft: "38px" }}
      >
        {actions}
      </div>
    </header>
  );
}

type IndustrialSectionHeadingProps = {
  title: string;
  accent?: "charcoal" | "red";
  className?: string;
  titleClassName?: string;
  children?: ReactNode;
};

export function IndustrialSectionHeading({
  title,
  accent = "charcoal",
  className,
  titleClassName,
  children,
}: IndustrialSectionHeadingProps) {
  return (
    <div
      className={cx(
        "px-4 py-2",
        accent === "red" ? "bg-[#B81318]" : "bg-[#33353A]",
        children ? "flex items-center justify-between gap-3" : undefined,
        className,
      )}
    >
      <h2 className={cx("text-xs font-bold uppercase tracking-widest text-white", titleClassName)}>{title}</h2>
      {children}
    </div>
  );
}

type IndustrialPanelProps = {
  title: string;
  accent?: "charcoal" | "red";
  className?: string;
  headingClassName?: string;
  titleClassName?: string;
  headingChildren?: ReactNode;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className" | "title">;

export const IndustrialPanel = forwardRef<HTMLElement, IndustrialPanelProps>(function IndustrialPanel(
  {
    title,
    accent = "charcoal",
    className,
    headingClassName,
    titleClassName,
    headingChildren,
    children,
    ...sectionProps
  },
  ref,
) {
  return (
    <section ref={ref} className={cx(industrialClasses.panel, className)} {...sectionProps}>
      <IndustrialSectionHeading
        title={title}
        accent={accent}
        className={headingClassName}
        titleClassName={titleClassName}
      >
        {headingChildren}
      </IndustrialSectionHeading>
      {children}
    </section>
  );
});

type IndustrialEmptyStateProps = {
  children: ReactNode;
  className?: string;
};

export function IndustrialEmptyState({ children, className }: IndustrialEmptyStateProps) {
  return <p className={cx(industrialClasses.emptyState, className)}>{children}</p>;
}

type IndustrialStatCardProps = {
  label: string;
  value: string;
  detail?: string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  detailClassName?: string;
};

export function IndustrialStatCard({
  label,
  value,
  detail,
  className,
  labelClassName,
  valueClassName,
  detailClassName,
}: IndustrialStatCardProps) {
  return (
    <div className={cx("border border-[#CCCCCC] bg-white p-4", className)}>
      <p className={cx("text-[10px] font-bold uppercase tracking-widest text-[#33353A]", labelClassName)}>{label}</p>
      <p className={cx("mt-1 text-2xl font-bold text-[#B81318]", valueClassName)}>{value}</p>
      {detail ? <p className={cx("text-xs text-slate-500", detailClassName)}>{detail}</p> : null}
    </div>
  );
}

type IndustrialHeaderActionLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function IndustrialHeaderActionLink({ href, children, className }: IndustrialHeaderActionLinkProps) {
  return (
    <Link href={href} className={cx(industrialClasses.headerActionControl, className)}>
      {children}
    </Link>
  );
}

type IndustrialHeaderActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function IndustrialHeaderActionButton({ className, children, type = "button", ...props }: IndustrialHeaderActionButtonProps) {
  return (
    <button type={type} className={cx(industrialClasses.headerActionControl, className)} {...props}>
      {children}
    </button>
  );
}

type IndustrialButtonVariant = "primary" | "secondary" | "danger" | "warning" | "ghost";
type IndustrialButtonSize = "sm" | "md" | "lg";

const industrialButtonVariantClasses: Record<IndustrialButtonVariant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  secondary: "border border-slate-300 text-slate-700 hover:bg-slate-100",
  danger: "border border-red-300 text-red-700 hover:bg-red-50",
  warning: "border border-amber-300 bg-white text-amber-800 hover:bg-amber-100",
  ghost: "text-slate-600 hover:bg-slate-100",
};

const industrialButtonSizeClasses: Record<IndustrialButtonSize, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs font-semibold",
  md: "rounded-lg px-4 py-2 text-sm font-semibold",
  lg: "rounded-xl px-5 py-3 text-sm font-semibold",
};

type IndustrialButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: IndustrialButtonVariant;
  size?: IndustrialButtonSize;
};

export function IndustrialButton({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: IndustrialButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "transition disabled:cursor-not-allowed disabled:opacity-60",
        industrialButtonVariantClasses[variant],
        industrialButtonSizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

type IndustrialInputProps = ComponentPropsWithoutRef<"input"> & {
  label?: ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
};

export const IndustrialInput = forwardRef<HTMLInputElement, IndustrialInputProps>(function IndustrialInput(
  { label, wrapperClassName, labelClassName, className, ...inputProps },
  ref,
) {
  const input = (
    <input
      ref={ref}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500",
        className,
      )}
      {...inputProps}
    />
  );

  if (!label) {
    return input;
  }

  return (
    <label className={cx("grid gap-1 text-xs text-slate-600", wrapperClassName)}>
      <span className={cx("font-medium", labelClassName)}>{label}</span>
      {input}
    </label>
  );
});

type IndustrialSelectProps = ComponentPropsWithoutRef<"select"> & {
  label?: ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
};

export const IndustrialSelect = forwardRef<HTMLSelectElement, IndustrialSelectProps>(function IndustrialSelect(
  { label, wrapperClassName, labelClassName, className, children, ...selectProps },
  ref,
) {
  const select = (
    <select
      ref={ref}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500",
        className,
      )}
      {...selectProps}
    >
      {children}
    </select>
  );

  if (!label) {
    return select;
  }

  return (
    <label className={cx("grid gap-1 text-xs text-slate-600", wrapperClassName)}>
      <span className={cx("font-medium", labelClassName)}>{label}</span>
      {select}
    </label>
  );
});

type IndustrialTextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  label?: ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
};

export const IndustrialTextarea = forwardRef<HTMLTextAreaElement, IndustrialTextareaProps>(function IndustrialTextarea(
  { label, wrapperClassName, labelClassName, className, ...textareaProps },
  ref,
) {
  const textarea = (
    <textarea
      ref={ref}
      className={cx(
        "min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500",
        className,
      )}
      {...textareaProps}
    />
  );

  if (!label) {
    return textarea;
  }

  return (
    <label className={cx("grid gap-1 text-xs text-slate-600", wrapperClassName)}>
      <span className={cx("font-medium", labelClassName)}>{label}</span>
      {textarea}
    </label>
  );
});

type IndustrialBadgeVariant = "red" | "slate" | "emerald" | "amber";

const industrialBadgeVariantClasses: Record<IndustrialBadgeVariant, string> = {
  red: "bg-[#B81318] text-white",
  slate: "bg-slate-200 text-slate-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
};

type IndustrialBadgeProps = {
  children: ReactNode;
  variant?: IndustrialBadgeVariant;
  className?: string;
};

export function IndustrialBadge({ children, variant = "slate", className }: IndustrialBadgeProps) {
  return (
    <span className={cx("inline-flex items-center px-2.5 py-1 text-xs font-bold uppercase", industrialBadgeVariantClasses[variant], className)}>
      {children}
    </span>
  );
}

type IndustrialAlertVariant = "danger" | "warning" | "success" | "info";

const industrialAlertVariantClasses: Record<IndustrialAlertVariant, string> = {
  danger: "border border-red-200 bg-red-50 text-red-700",
  warning: "border border-amber-200 bg-amber-50 text-amber-800",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border border-slate-200 bg-slate-50 text-slate-700",
};

type IndustrialAlertProps = {
  children: ReactNode;
  variant?: IndustrialAlertVariant;
  className?: string;
};

export function IndustrialAlert({ children, variant = "info", className }: IndustrialAlertProps) {
  return (
    <div role="alert" className={cx("rounded-xl px-3 py-2 text-sm", industrialAlertVariantClasses[variant], className)}>
      {children}
    </div>
  );
}

type IndustrialComboboxOption = {
  value: string;
  label: string;
};

type IndustrialComboboxProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: IndustrialComboboxOption[];
  required?: boolean;
  placeholder?: string;
  noMatchesText?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  locale?: string;
};

export function IndustrialCombobox({
  label,
  value,
  onChange,
  options,
  required,
  placeholder = "Escribe para buscar",
  noMatchesText = "No hay coincidencias.",
  wrapperClassName,
  labelClassName,
  inputClassName,
  dropdownClassName,
  locale = "es-ES",
}: IndustrialComboboxProps) {
  const [open, setOpen] = useState(false);

  const searchableOptions = useMemo(
    () => options.filter((option) => option.value !== ""),
    [options],
  );

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase(locale);
    if (!query) {
      return searchableOptions.slice(0, 12);
    }

    return searchableOptions
      .filter((option) => option.label.toLocaleLowerCase(locale).includes(query))
      .slice(0, 12);
  }, [locale, searchableOptions, value]);

  function normalizeToValidOption(rawValue: string) {
    const normalized = rawValue.trim().toLocaleLowerCase(locale);
    if (!normalized) {
      onChange("");
      return;
    }

    const exact = searchableOptions.find(
      (option) => option.value.toLocaleLowerCase(locale) === normalized || option.label.toLocaleLowerCase(locale) === normalized,
    );

    onChange(exact ? exact.value : "");
  }

  return (
    <div className={cx("relative grid gap-1 text-sm text-slate-700", wrapperClassName)}>
      <span className={cx("font-medium", labelClassName)}>{label}</span>
      <input
        className={cx(
          "rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-red-500",
          inputClassName,
        )}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            normalizeToValidOption(value);
            setOpen(false);
          }, 120);
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {open ? (
        filteredOptions.length > 0 ? (
          <ul className={cx("absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg", dropdownClassName)}>
            {filteredOptions.map((option) => (
              <li
                key={option.value}
                className="cursor-pointer px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-slate-900"
                onMouseDown={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        ) : (
          <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-lg">
            {noMatchesText}
          </div>
        )
      ) : null}
    </div>
  );
}
