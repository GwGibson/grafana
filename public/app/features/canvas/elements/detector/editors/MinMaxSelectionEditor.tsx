import { css } from '@emotion/css';
import React, { useCallback } from 'react';

import { SelectableValue, StandardEditorProps, FieldType, getFieldDisplayName } from '@grafana/data';
import { Select, InlineField, InlineFieldRow, useStyles2 } from '@grafana/ui';
import { useFieldDisplayNames, useSelectOptions } from '@grafana/ui/src/components/MatchersUI/utils';
import { NumberInput } from 'app/core/components/OptionsUI/NumberInput';

interface MinMaxRangeConfig {
  min: { value: number; field?: string };
  max: { value: number; field?: string };
}

const fixedValueOption: SelectableValue<string> = {
  label: 'Fixed value',
  value: '_____fixed_____',
} as const;

const DEFAULT_VALUE = 0 as const;

type Props = StandardEditorProps<MinMaxRangeConfig>;

export const MinMaxSelectionEditor: React.FC<Props> = ({ value, context, onChange }) => {
  const styles = useStyles2(getStyles);
  const names = useFieldDisplayNames(context.data);

  // TODO: better way to get field value? Use ScaleDimensionConfig, ScaleDimensionOption and getScalar?
  const getFieldValue = useCallback(
    (fieldName: string): number => {
      if (!context.data) {
        return DEFAULT_VALUE;
      }
      for (const frame of context.data) {
        const field = frame.fields.find((f) => getFieldDisplayName(f, frame, context.data) === fieldName);
        if (field && field.values.length > 0) {
          const lastValue = field.values[field.values.length - 1];
          return typeof lastValue === 'number' ? lastValue : DEFAULT_VALUE;
        }
      }
      return DEFAULT_VALUE;
    },
    [context.data]
  );

  const handleChange = useCallback(
    (type: 'max' | 'min', newValue: { value: number; field?: string }) => {
      onChange({
        ...value,
        [type]: newValue,
      });
    },
    [onChange, value]
  );

  const RenderField = (type: 'max' | 'min') => {
    const currentValue = value?.[type] || { value: DEFAULT_VALUE };
    const isFixed = !currentValue.field;
    const selectOptions = useSelectOptions(names, currentValue.field, fixedValueOption, FieldType.number);
    const selectedOption = isFixed ? fixedValueOption : selectOptions.find((v) => v.value === currentValue.field);

    return (
      <div className={styles.fieldContainer}>
        <Select
          value={selectedOption}
          options={selectOptions}
          onChange={(selection) => {
            if (selection.value === fixedValueOption.value) {
              handleChange(type, { value: currentValue.value ?? DEFAULT_VALUE });
            } else {
              handleChange(type, { value: getFieldValue(selection.value!), field: selection.value });
            }
          }}
          width={24}
        />
        {isFixed && (
          <NumberInput
            value={currentValue.value ?? DEFAULT_VALUE}
            onChange={(v) => handleChange(type, { value: v ?? DEFAULT_VALUE })}
            width={16}
          />
        )}
      </div>
    );
  };

  return (
    <InlineFieldRow>
      <InlineField label="Max" labelWidth={8}>
        {RenderField('max')}
      </InlineField>
      <InlineField label="Min" labelWidth={8}>
        {RenderField('min')}
      </InlineField>
    </InlineFieldRow>
  );
};

const getStyles = () => ({
  fieldContainer: css`
    display: flex;
    align-items: center;
    > * + * {
      margin-left: 4px;
    }
  `,
});
