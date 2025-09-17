import React from 'react';

import { StandardEditorProps } from '@grafana/data';
import { InlineField, MultiSelect } from '@grafana/ui';

import { DetectorConfig } from '../detector';
import { componentMap } from '../detectors/data/componentMap';

type Props = StandardEditorProps<{ [arrayName: string]: string[] }, DetectorConfig>;

export const NetworkArrayEditor: React.FC<Props> = ({ value = {}, context, onChange }) => {
  const data = context.instanceState?.selected?.[0].data || undefined;
  const detectorType = data?.detectorType as string | undefined;

  if (!detectorType || !componentMap[detectorType]) {
    return <div>Please select a detector type first</div>;
  }

  const config = componentMap[detectorType];

  const handleArrayNetworkChange = (arrayName: string, selectedNetworks: string[]) => {
    const updatedValue = { ...value };

    if (selectedNetworks.length === 0) {
      delete updatedValue[arrayName];
    } else {
      updatedValue[arrayName] = selectedNetworks;
    }

    onChange(updatedValue);
  };

  const handleSelectAll = (arrayName: string) => {
    const updatedValue = { ...value };
    updatedValue[arrayName] = [...config.networkNames];
    onChange(updatedValue);
  };

  const handleClear = (arrayName: string) => {
    const updatedValue = { ...value };
    delete updatedValue[arrayName];
    onChange(updatedValue);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {config.arrayNames.map((arrayName) => {
        const networkOptions = config.networkNames.map((name) => ({
          label: name,
          value: name,
        }));

        const selectedNetworks = value[arrayName] || [];
        const allSelected = selectedNetworks.length === config.networkNames.length;

        return (
          <InlineField
            key={arrayName}
            label={arrayName}
            labelWidth={20}
            tooltip={`Select networks for ${arrayName} array`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MultiSelect
                options={networkOptions}
                value={selectedNetworks.map((net) => ({ label: net, value: net }))}
                onChange={(selected) =>
                  handleArrayNetworkChange(
                    arrayName,
                    selected.map((s) => s.value!)
                  )
                }
                placeholder={`Select ${arrayName} networks`}
                width={40}
                closeMenuOnSelect={false}
                isClearable={true}
                maxVisibleValues={3}
              />
              <button
                onClick={() => (allSelected ? handleClear(arrayName) : handleSelectAll(arrayName))}
                style={{
                  padding: '4px 8px',
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  background: '#fff',
                  fontSize: '12px',
                }}
              >
                {allSelected ? 'Clear' : 'All'}
              </button>
            </div>
          </InlineField>
        );
      })}
    </div>
  );
};
