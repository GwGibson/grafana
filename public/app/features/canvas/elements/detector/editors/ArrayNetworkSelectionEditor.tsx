import React, { useCallback } from 'react';

import { SelectableValue, StandardEditorContext, StandardEditorProps } from '@grafana/data';
import { MultiSelect } from '@grafana/ui';

import { DetectorConfig } from '../detector';
import { getArraysForDetector, getNetworksForDetectorArrays, MAX_NETWORK_VALUES } from '../detectors/data/componentMap';

type DetectorComponent = 'network' | 'array';

type Props = StandardEditorProps<string[], DetectorConfig>;

interface DetectorComponentSelectorProps {
  value: string[];
  context: StandardEditorContext<DetectorConfig>;
  onChange: (value: string[]) => void;
  componentType: DetectorComponent;
  allOptionLabel: string;
}

export const allValue = 'all' as const;

export const DetectorComponentSelector: React.FC<DetectorComponentSelectorProps> = ({
  value,
  context,
  onChange,
  componentType,
  allOptionLabel,
}) => {
  const data = context.instanceState?.selected?.[0].data || undefined;
  const detectorType = data?.detectorType as string | undefined;
  const selectedArrays = data?.displayData?.selectedArrays || [];

  const getComponentOptions = () => {
    if (detectorType) {
      let options: string[];
      if (componentType === 'array') {
        options = getArraysForDetector(detectorType);
      } else {
        options = getNetworksForDetectorArrays(detectorType, selectedArrays);
      }
      return options.map((component: string) => ({ label: component, value: component }));
    }
    return [{ label: allOptionLabel, value: allValue }];
  };

  const componentOptions = getComponentOptions();
  const allComponentOption: SelectableValue<string> = { label: allOptionLabel, value: allValue };

  const onSelectionChange = useCallback(
    (selected: Array<SelectableValue<string>>) => {
      let selectedValues: string[];

      if (selected.some((option) => option.value === allValue)) {
        selectedValues = componentOptions.map((option: { value: any }) => option.value);
      } else {
        selectedValues = selected.map((option) => option.value!);
      }
      onChange(selectedValues);
    },
    [onChange, componentOptions]
  );

  const getSelectedOptions = () => {
    if (!value || value.length === 0 || !detectorType) {
      return [];
    }
    if (value.includes(allValue)) {
      return componentOptions.map((option: { value: string }) => option.value);
    }
    return componentOptions.filter((option: { value: string }) => value.includes(option.value));
  };

  return (
    <MultiSelect
      options={[allComponentOption, ...componentOptions]}
      value={getSelectedOptions()}
      onChange={onSelectionChange}
      placeholder={`Select ${componentType}s`}
      menuPlacement="auto"
      maxVisibleValues={MAX_NETWORK_VALUES}
      closeMenuOnSelect={true}
      isClearable={true}
    />
  );
};

export const DetectorNetworkEditor: React.FC<Props> = (props) => (
  <DetectorComponentSelector {...props} componentType="network" allOptionLabel="All Networks" />
);

export const DetectorArrayEditor: React.FC<Props> = (props) => (
  <DetectorComponentSelector {...props} componentType="array" allOptionLabel="All Sensor Arrays" />
);
