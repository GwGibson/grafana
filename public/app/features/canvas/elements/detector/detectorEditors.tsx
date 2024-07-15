import React, { useCallback, useMemo } from 'react';

import { SelectableValue, StandardEditorContext, StandardEditorProps } from '@grafana/data';
import { MultiSelect } from '@grafana/ui';

import { DetectorConfig } from './detector';
import {
  DetectorType,
  getArraysForDetector,
  getNetworksForDetectorArrays,
  MAX_NETWORK_VALUES,
} from './types/moduleInfo';

// Have these editors here as they are Detector specific and not generalized.
type DetectorComponent = 'network' | 'array';

interface DetectorComponentSelectorProps {
  value: string[];
  context: StandardEditorContext<DetectorConfig>;
  onChange: (value: string[]) => void;
  componentType: DetectorComponent;
  allOptionLabel: string;
}

export const allValue = 'all';

export const DetectorComponentSelector: React.FC<DetectorComponentSelectorProps> = ({
  value,
  context,
  onChange,
  componentType,
  allOptionLabel,
}) => {
  const config = context.instanceState?.layer?.elements?.[0]?.options?.config || undefined;
  const detectorType = config?.detectorType as DetectorType | undefined;
  const selectedArrays = useMemo(() => config?.arrays || [], [config?.arrays]);

  const componentOptions = useMemo(() => {
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
  }, [detectorType, componentType, allOptionLabel, selectedArrays]);

  const allComponentOption: SelectableValue<string> = useMemo(
    () => ({ label: allOptionLabel, value: allValue }),
    [allOptionLabel]
  );

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

  const selectedOptions = useMemo(() => {
    if (!value || value.length === 0 || !detectorType) {
      return [];
    }
    if (value.includes(allValue)) {
      return componentOptions.map((option: { value: string }) => option.value);
    }
    return componentOptions.filter((option: { value: string }) => value.includes(option.value));
  }, [value, componentOptions, detectorType]);

  return (
    <MultiSelect
      options={[allComponentOption, ...componentOptions]}
      value={selectedOptions}
      onChange={onSelectionChange}
      placeholder={`Select ${componentType}s`}
      menuPlacement="auto"
      maxVisibleValues={MAX_NETWORK_VALUES}
      closeMenuOnSelect={true}
      isClearable={true}
    />
  );
};

export const DetectorNetworkEditor: React.FC<StandardEditorProps<string[], DetectorConfig>> = (props) => (
  <DetectorComponentSelector {...props} componentType="network" allOptionLabel="All Networks" />
);

export const DetectorArrayEditor: React.FC<StandardEditorProps<string[], DetectorConfig>> = (props) => (
  <DetectorComponentSelector {...props} componentType="array" allOptionLabel="All Sensor Arrays" />
);
