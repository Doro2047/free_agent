export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const mediaQueries = {
  xs: `(${typeof window !== 'undefined' ? window.innerWidth : 0}px <= ${breakpoints.xs})`,
  sm: `(${typeof window !== 'undefined' ? window.innerWidth : 0}px >= ${breakpoints.sm})`,
  md: `(${typeof window !== 'undefined' ? window.innerWidth : 0}px >= ${breakpoints.md})`,
  lg: `(${typeof window !== 'undefined' ? window.innerWidth : 0}px >= ${breakpoints.lg})`,
  xl: `(${typeof window !== 'undefined' ? window.innerWidth : 0}px >= ${breakpoints.xl})`,
  '2xl': `(${typeof window !== 'undefined' ? window.innerWidth : 0}px >= ${breakpoints['2xl']})`,
} as const;

export function getResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>
): T | undefined {
  if (typeof window === 'undefined') return values.md || values.sm || values.lg;

  const width = window.innerWidth;

  const orderedBreakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];

  for (const breakpoint of orderedBreakpoints) {
    const breakpointWidth = parseInt(breakpoints[breakpoint]);
    if (width >= breakpointWidth && values[breakpoint]) {
      return values[breakpoint];
    }
  }

  return values.xs || values.sm;
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('md');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;

      if (width >= parseInt(breakpoints['2xl'])) setBreakpoint('2xl');
      else if (width >= parseInt(breakpoints.xl)) setBreakpoint('xl');
      else if (width >= parseInt(breakpoints.lg)) setBreakpoint('lg');
      else if (width >= parseInt(breakpoints.md)) setBreakpoint('md');
      else if (width >= parseInt(breakpoints.sm)) setBreakpoint('sm');
      else setBreakpoint('xs');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

import React from 'react';

export interface GridProps {
  children: React.ReactNode;
  columns?: number | Partial<Record<Breakpoint, number>>;
  rows?: number | Partial<Record<Breakpoint, number>>;
  gap?: string | Partial<Record<Breakpoint, string>>;
  autoFit?: boolean;
  autoFill?: boolean;
  minItemWidth?: string | Partial<Record<Breakpoint, string>>;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns,
  rows,
  gap,
  autoFit = false,
  autoFill = false,
  minItemWidth,
}) => {
  const breakpoint = useBreakpoint();

  const getValue = <T,>(value: T | Partial<Record<Breakpoint, T>> | undefined): T | undefined => {
    if (!value) return undefined;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return (value as Partial<Record<Breakpoint, T>>)[breakpoint] || Object.values(value as Partial<Record<Breakpoint, T>>)[0];
    }
    return value as T;
  };

  const gridTemplateColumns =
    autoFit || autoFill
      ? `repeat(${autoFill ? 'auto-fill' : 'auto-fit'}, minmax(${getValue(minItemWidth) || '250px'}, 1fr))`
      : columns
      ? `repeat(${getValue(columns)}, 1fr)`
      : 'repeat(auto-fit, minmax(250px, 1fr))';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns,
        gridTemplateRows: rows ? `repeat(${getValue(rows)}, 1fr)` : undefined,
        gap: getValue(gap) || '1rem',
      }}
    >
      {children}
    </div>
  );
};

export interface StackProps {
  children: React.ReactNode;
  direction?: 'row' | 'column' | Partial<Record<Breakpoint, 'row' | 'column'>>;
  spacing?: string | Partial<Record<Breakpoint, string>>;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline' | Partial<Record<Breakpoint, 'start' | 'center' | 'end' | 'stretch' | 'baseline'>>;
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' | Partial<Record<Breakpoint, 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'>>;
  wrap?: boolean | Partial<Record<Breakpoint, boolean>>;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'column',
  spacing = '1rem',
  align = 'stretch',
  justify = 'start',
  wrap = false,
}) => {
  const breakpoint = useBreakpoint();

  const getValue = <T,>(value: T | Partial<Record<Breakpoint, T>> | undefined, fallback: T): T => {
    if (!value) return fallback;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return (value as Partial<Record<Breakpoint, T>>)[breakpoint] || fallback;
    }
    return value as T;
  };

  const flexDirection = getValue(direction, 'column');
  const flexGap = getValue(spacing, '1rem');
  const flexAlign = getValue(align, 'stretch');
  const flexJustify = getValue(justify, 'start');
  const flexWrap = getValue(wrap, false);

  const alignValues: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
    baseline: 'baseline',
  };

  const justifyValues: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection,
        gap: flexGap,
        alignItems: alignValues[flexAlign] || flexAlign,
        justifyContent: justifyValues[flexJustify] || flexJustify,
        flexWrap: flexWrap ? 'wrap' : 'nowrap',
      }}
    >
      {children}
    </div>
  );
};

export interface BoxProps {
  children: React.ReactNode;
  display?: string | Partial<Record<Breakpoint, string>>;
  width?: string | number | Partial<Record<Breakpoint, string | number>>;
  height?: string | number | Partial<Record<Breakpoint, string | number>>;
  maxWidth?: string | number | Partial<Record<Breakpoint, string | number>>;
  maxHeight?: string | number | Partial<Record<Breakpoint, string | number>>;
  minWidth?: string | number | Partial<Record<Breakpoint, string | number>>;
  minHeight?: string | number | Partial<Record<Breakpoint, string | number>>;
  padding?: string | number | Partial<Record<Breakpoint, string | number>>;
  paddingX?: string | number | Partial<Record<Breakpoint, string | number>>;
  paddingY?: string | number | Partial<Record<Breakpoint, string | number>>;
  paddingTop?: string | number | Partial<Record<Breakpoint, string | number>>;
  paddingBottom?: string | number | Partial<Record<Breakpoint, string | number>>;
  paddingLeft?: string | number | Partial<Record<Breakpoint, string | number>>;
  paddingRight?: string | number | Partial<Record<Breakpoint, string | number>>;
  margin?: string | number | Partial<Record<Breakpoint, string | number>>;
  marginX?: string | number | Partial<Record<Breakpoint, string | number>>;
  marginY?: string | number | Partial<Record<Breakpoint, string | number>>;
  marginTop?: string | number | Partial<Record<Breakpoint, string | number>>;
  marginBottom?: string | number | Partial<Record<Breakpoint, string | number>>;
  marginLeft?: string | number | Partial<Record<Breakpoint, string | number>>;
  marginRight?: string | number | Partial<Record<Breakpoint, string | number>>;
  style?: React.CSSProperties;
}

export const Box: React.FC<BoxProps> = (props) => {
  const breakpoint = useBreakpoint();

  const getValue = <T,>(value: T | Partial<Record<Breakpoint, T>> | undefined, fallback?: T): T | undefined => {
    if (value === undefined) return fallback;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return (value as Partial<Record<Breakpoint, T>>)[breakpoint] || fallback;
    }
    return value as T;
  };

  const getSpacing = (value: string | number | Partial<Record<Breakpoint, string | number>> | undefined, fallback: string): string => {
    const result = getValue(value, fallback);
    if (typeof result === 'number') return `${result}px`;
    return result || fallback;
  };

  const {
    children,
    display,
    width,
    height,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight,
    padding,
    paddingX,
    paddingY,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    margin,
    marginX,
    marginY,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    style,
    ...rest
  } = props;

  return (
    <div
      style={{
        display: display ? getValue(display) as React.CSSProperties['display'] : undefined,
        width: width ? getSpacing(width as any, 'auto') as any : undefined,
        height: height ? getSpacing(height as any, 'auto') as any : undefined,
        maxWidth: maxWidth ? getSpacing(maxWidth as any, 'none') as any : undefined,
        maxHeight: maxHeight ? getSpacing(maxHeight as any, 'none') as any : undefined,
        minWidth: minWidth ? getSpacing(minWidth as any, 'auto') as any : undefined,
        minHeight: minHeight ? getSpacing(minHeight as any, 'auto') as any : undefined,
        padding: padding ? getSpacing(padding as any, '0') : undefined,
        paddingLeft: paddingX ? getSpacing(paddingX as any, '0') : paddingLeft ? getSpacing(paddingLeft as any, '0') : undefined,
        paddingRight: paddingX ? getSpacing(paddingX as any, '0') : paddingRight ? getSpacing(paddingRight as any, '0') : undefined,
        paddingTop: paddingY ? getSpacing(paddingY as any, '0') : paddingTop ? getSpacing(paddingTop as any, '0') : undefined,
        paddingBottom: paddingY ? getSpacing(paddingY as any, '0') : paddingBottom ? getSpacing(paddingBottom as any, '0') : undefined,
        margin: margin ? getSpacing(margin as any, '0') : undefined,
        marginLeft: marginX ? getSpacing(marginX as any, '0') : marginLeft ? getSpacing(marginLeft as any, '0') : undefined,
        marginRight: marginX ? getSpacing(marginX as any, '0') : marginRight ? getSpacing(marginRight as any, '0') : undefined,
        marginTop: marginY ? getSpacing(marginY as any, '0') : marginTop ? getSpacing(marginTop as any, '0') : undefined,
        marginBottom: marginY ? getSpacing(marginY as any, '0') : marginBottom ? getSpacing(marginBottom as any, '0') : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export const hideOn = (breakpoint: Breakpoint | Breakpoint[]): React.CSSProperties => {
  const breakpoints = Array.isArray(breakpoint) ? breakpoint : [breakpoint];
  const breakpointWidths = breakpoints.map((bp) => breakpoints[bp]);

  return {
    display: 'none',
  };
};

export const showOn = (breakpoint: Breakpoint | Breakpoint[]): React.CSSProperties => {
  const styles: React.CSSProperties = { display: 'block' };
  return styles;
};

export const ResponsiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
