import { useCallback } from 'react';

import { SelectableValue, StandardEditorProps } from '@grafana/data';
import { ScalarDimensionConfig } from '@grafana/schema';
import { Select } from '@grafana/ui';
import { useFieldDisplayNames, useSelectOptions } from '@grafana/ui/src/components/MatchersUI/utils';

import { ScalarDimensionOptions } from '../types';

type Props = StandardEditorProps<ScalarDimensionConfig, ScalarDimensionOptions>;

export const ScalarFieldDimensionEditor = ({ value, context, onChange }: Props) => {
  const fieldName = value?.field;
  const names = useFieldDisplayNames(context.data);
  const selectOptions = useSelectOptions(names, fieldName);

  const onSelectChange = useCallback(
    (selection: SelectableValue<string>) => {
      const field = selection.value;
      onChange({
        ...value,
        field,
      });
    },
    [onChange, value]
  );

  const selectedOption = selectOptions.find((v) => v.value === fieldName);
  return (
    <>
      <div>
        <Select
          value={selectedOption}
          options={selectOptions}
          onChange={onSelectChange}
          noOptionsMessage="No fields found"
        />
      </div>
    </>
  );
};
