import React, { useCallback, useMemo } from 'react';

import { SelectableValue, StandardEditorContext, StandardEditorProps } from '@grafana/data';
import { MultiSelect } from '@grafana/ui';

import { DETECTOR_ARRAYS, DETECTOR_NETWORKS, DetectorConfig, DetectorType } from '../detector';

// Have these here since they are specific to Detector components and not general purpose editors.

type DetectorComponent = 'network' | 'array';

interface DetectorComponentSelectorProps<T extends DetectorComponent> {
  value: string[];
  context: StandardEditorContext<DetectorConfig>;
  onChange: (value: string[]) => void;
  componentType: T;
  componentMap: Record<DetectorType, string[]>;
  allOptionLabel: string;
}

export const allValue = 'all';

export const DetectorComponentSelector: React.FC<DetectorComponentSelectorProps<DetectorComponent>> = ({
  value,
  context,
  onChange,
  componentType,
  componentMap,
  allOptionLabel,
}) => {
  const detectorType =
    (context.instanceState?.layer?.elements?.[0]?.options?.config?.detectorType as DetectorType) || undefined;

  const componentOptions = useMemo(() => {
    if (detectorType && componentMap[detectorType]) {
      return componentMap[detectorType].map((component) => ({ label: component, value: component.toLowerCase() }));
    }
    return [{ label: allOptionLabel, value: allValue }];
  }, [detectorType, componentMap, allOptionLabel]);

  const allComponentOption: SelectableValue<string> = useMemo(
    () => ({ label: allOptionLabel, value: allValue }),
    [allOptionLabel]
  );

  const onSelectionChange = useCallback(
    (selected: Array<SelectableValue<string>>) => {
      let selectedValues: string[];

      if (selected.some((option) => option.value === allValue)) {
        selectedValues = componentOptions.map((option) => option.value);
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
      return componentOptions.map((option) => option.value);
    }
    return componentOptions.filter((option) => value.includes(option.value));
  }, [value, componentOptions, detectorType]);

  return (
    <MultiSelect
      options={[allComponentOption, ...componentOptions]}
      value={selectedOptions}
      onChange={onSelectionChange}
      placeholder={`Select ${componentType}s`}
      menuPlacement="auto"
      maxVisibleValues={9}
      closeMenuOnSelect={true}
      isClearable={true}
    />
  );
};

export const DetectorNetworkEditor: React.FC<StandardEditorProps<string[], DetectorConfig>> = (props) => (
  <DetectorComponentSelector
    {...props}
    componentType="network"
    componentMap={DETECTOR_NETWORKS}
    allOptionLabel="All Networks"
  />
);

export const DetectorArrayEditor: React.FC<StandardEditorProps<string[], DetectorConfig>> = (props) => (
  <DetectorComponentSelector
    {...props}
    componentType="array"
    componentMap={DETECTOR_ARRAYS}
    allOptionLabel="All Arrays"
  />
);
