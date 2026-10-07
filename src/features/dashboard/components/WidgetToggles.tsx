import { memo, type JSX } from 'react';
import { WIDGET_IDS, WIDGET_LABELS, type WidgetId } from '../model/widgets';
import './WidgetToggles.css';

type WidgetTogglesProps = Readonly<{
  hiddenWidgetIds: readonly WidgetId[];
  onToggle: (id: WidgetId) => void;
}>;

// Memoized: the page re-renders on every poll, but the toggles only depend on the hidden ids
// and a stable `onToggle`, so they can skip those renders.
export const WidgetToggles = memo(function WidgetToggles({
  hiddenWidgetIds,
  onToggle,
}: WidgetTogglesProps): JSX.Element {
  return (
    <fieldset className="widget-toggles">
      <legend className="widget-toggles__legend">Show widgets</legend>
      {WIDGET_IDS.map((id) => (
        <label className="widget-toggles__option" key={id}>
          <input
            type="checkbox"
            checked={!hiddenWidgetIds.includes(id)}
            onChange={() => {
              onToggle(id);
            }}
          />
          {WIDGET_LABELS[id]}
        </label>
      ))}
    </fieldset>
  );
});
