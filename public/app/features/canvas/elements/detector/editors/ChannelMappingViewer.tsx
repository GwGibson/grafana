import { css } from '@emotion/css';
import React, { useState, useEffect, useCallback } from 'react';

import { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import { CollapsableSection, useStyles2, Button } from '@grafana/ui';

import { DetectorConfig } from '../detector';
import PoolFactory from '../utils/poolFactory';

type Props = StandardEditorProps<any, DetectorConfig>;

interface MappingInfo {
  networkId: string;
  indices: number[];
  sensorCount: number;
}

/**
 * Read-only viewer for channel mappings
 * Displays current mappings stored in the ChannelMappingPool
 * Auto-refreshes periodically and provides manual refresh button
 */
export const ChannelMappingViewer: React.FC<Props> = ({}) => {
  const styles = useStyles2(getStyles);
  const [mappings, setMappings] = useState<MappingInfo[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to refresh mappings from the pool
  const refreshMappings = useCallback(() => {
    try {
      const mappingPool = PoolFactory.getChannelMappingPool();
      const mappedNetworks = mappingPool.getMappedNetworks();

      const newMappings = mappedNetworks.map((networkId) => {
        const mapping = mappingPool.getNetworkMapping(networkId);
        return {
          networkId,
          indices: mapping ? Array.from(mapping) : [],
          sensorCount: mapping ? mapping.length : 0,
        };
      });

      setMappings(newMappings);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error reading channel mappings:', error);
      setMappings([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshMappings();
  }, [refreshMappings]);

  // Auto-refresh when section is expanded (every 2 seconds)
  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const intervalId = setInterval(() => {
      refreshMappings();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isExpanded, refreshMappings]);

  const handleToggle = (open: boolean) => {
    setIsExpanded(open);
    if (open) {
      // Refresh immediately when opening
      refreshMappings();
    }
  };

  const content =
    mappings.length === 0 ? (
      <div className={styles.emptyState}>
        <p>No channel mappings configured</p>
        <p className={styles.hint}>
          Channel mappings are configured by sending a config message from your backend with type &quot;config&quot; and
          a channelMappings object.
        </p>
        <Button variant="secondary" size="sm" icon="sync" onClick={refreshMappings}>
          Refresh
        </Button>
      </div>
    ) : (
      <div>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <strong>Current Channel Mappings</strong>
            <span className={styles.count}>({mappings.length} networks configured)</span>
          </div>
          <div className={styles.headerRight}>
            {lastUpdated && <span className={styles.timestamp}>Updated: {lastUpdated.toLocaleTimeString()}</span>}
            <Button variant="secondary" size="sm" icon="sync" onClick={refreshMappings} tooltip="Refresh mappings">
              Refresh
            </Button>
          </div>
        </div>

        {mappings.map(({ networkId, indices, sensorCount }) => (
          <CollapsableSection key={networkId} label={networkId} isOpen={false}>
            <div className={styles.mappingDetails}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Sensor Count:</span>
                <span className={styles.value}>{sensorCount}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.label}>Channel Indices:</span>
                <div className={styles.indicesContainer}>
                  <code className={styles.indices}>
                    [
                    {indices.length > 10
                      ? `${indices.slice(0, 10).join(', ')}, ... (${indices.length} total)`
                      : indices.join(', ')}
                    ]
                  </code>
                </div>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.label}>Full Mapping:</span>
                <button
                  className={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(indices));
                  }}
                >
                  Copy JSON
                </button>
              </div>
            </div>
          </CollapsableSection>
        ))}
      </div>
    );

  return (
    <div className={styles.container}>
      <CollapsableSection label="Channel Mapping Details" isOpen={isExpanded} onToggle={handleToggle}>
        {content}
      </CollapsableSection>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    padding: '8px',
    border: '1px solid rgba(204, 204, 220, 0.2)',
    borderRadius: theme.shape.borderRadius(2),
    backgroundColor: 'rgba(32, 34, 42, 0.5)',
  }),
  header: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '14px',
    flexWrap: 'wrap',
    gap: '8px',
  }),
  headerLeft: css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  headerRight: css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  count: css({
    fontSize: '12px',
    color: '#888',
  }),
  timestamp: css({
    fontSize: '11px',
    color: '#666',
  }),
  emptyState: css({
    padding: '16px',
    textAlign: 'center',
    color: '#888',
    '& p': {
      margin: '8px 0',
    },
  }),
  hint: css({
    fontSize: '12px',
    fontStyle: 'italic',
  }),
  mappingDetails: css({
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }),
  infoRow: css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  }),
  label: css({
    fontWeight: 500,
    minWidth: '120px',
    color: '#aaa',
  }),
  value: css({
    color: '#fff',
  }),
  indicesContainer: css({
    flex: 1,
    overflow: 'auto',
  }),
  indices: css({
    fontSize: '12px',
    padding: '4px 8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.shape.borderRadius(1),
    display: 'inline-block',
    maxWidth: '100%',
    wordBreak: 'break-all',
  }),
  copyButton: css({
    padding: '4px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    border: '1px solid #555',
    borderRadius: theme.shape.borderRadius(1),
    backgroundColor: '#333',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#444',
    },
  }),
});
