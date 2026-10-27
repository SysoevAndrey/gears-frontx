import { SettingsIcon } from 'lucide-react';

import { Button } from '../../../../button/public.js';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../popover/public.js';
import { messages } from '../../../messages';
import styles from './data-grid-table-configuration.module.css';
import { DataGridTableConfiguration } from './data-grid-table-configuration';

export function DataGridTableConfigurationTrigger() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            icon={<SettingsIcon />}
            aria-label={messages.tableConfiguration.configureColumns}
          />
        }
      />
      <PopoverContent side="bottom" align="end" sideOffset={4} className={styles.popup}>
        <DataGridTableConfiguration />
      </PopoverContent>
    </Popover>
  );
}
