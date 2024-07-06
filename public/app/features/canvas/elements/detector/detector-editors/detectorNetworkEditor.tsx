import React, { useCallback, useMemo } from 'react';

import { SelectableValue, StandardEditorProps } from '@grafana/data';
import { MultiSelect } from '@grafana/ui';

import { DETECTOR_NETWORKS, DetectorConfig, DetectorType } from '../detector';

export const DetectorNetworkEditor: React.FC<StandardEditorProps<string[], DetectorConfig>> = ({
  value,
  context,
  onChange,
}) => {
  const detectorType =
    (context.instanceState?.layer?.elements?.[0]?.options?.config?.detectorType as DetectorType) || undefined;

  const networkOptions = useMemo(() => {
    if (detectorType && DETECTOR_NETWORKS[detectorType]) {
      return DETECTOR_NETWORKS[detectorType].map((network) => ({ label: network, value: network.toLowerCase() }));
    }
    return [{ label: 'All Networks', value: 'all' }];
  }, [detectorType]);

  const allNetworksOption: SelectableValue<string> = useMemo(() => ({ label: 'All Networks', value: 'all' }), []);

  const onSelectionChange = useCallback(
    (selected: Array<SelectableValue<string>>) => {
      let selectedValues: string[];

      if (selected.some((option) => option.value === 'all')) {
        // If 'All Networks' is selected, choose all networks except 'All Networks'
        selectedValues = networkOptions.map((option) => option.value);
      } else {
        // Otherwise, just use the selected values
        selectedValues = selected.map((option) => option.value!);
      }
      onChange(selectedValues);
    },
    [onChange, networkOptions]
  );

  const selectedOptions = useMemo(() => {
    if (!value || value.length === 0 || !detectorType) {
      return [];
    }
    if (value.includes('all')) {
      return networkOptions.map((option) => option.value);
    }
    return networkOptions.filter((option) => value.includes(option.value));
  }, [value, networkOptions, detectorType]);

  return (
    <MultiSelect
      options={[allNetworksOption, ...networkOptions]}
      value={selectedOptions}
      onChange={onSelectionChange}
      placeholder="Select networks"
      menuPlacement="auto"
      maxVisibleValues={9}
      closeMenuOnSelect={true}
      isClearable={true}
    />
  );
};
