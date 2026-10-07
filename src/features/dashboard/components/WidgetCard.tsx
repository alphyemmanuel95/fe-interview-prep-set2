import { useId, type JSX, type ReactNode } from 'react';
import './WidgetCard.css';

type WidgetCardProps = Readonly<{
  title: string;
  children: ReactNode;
}>;

export function WidgetCard({ title, children }: WidgetCardProps): JSX.Element {
  const headingId = useId();
  return (
    <section className="widget-card" aria-labelledby={headingId}>
      <h2 className="widget-card__title" id={headingId}>
        {title}
      </h2>
      {children}
    </section>
  );
}
