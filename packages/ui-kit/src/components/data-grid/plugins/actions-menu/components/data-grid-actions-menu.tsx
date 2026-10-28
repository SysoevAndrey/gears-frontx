import { EllipsisIcon } from 'lucide-react';

import { Button } from '../../../../button/public.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../../dropdown-menu/public.js';
import { messages } from '../../../messages';
import { useDataGrid } from '../../../services/core/data-grid-context';
import type { DataGridActionsMenuPluginApi } from '../actions-menu-types';

export function DataGridActionsMenu() {
  const grid = useDataGrid();
  const actionsMenu = grid.getPlugin<DataGridActionsMenuPluginApi>('actionsMenu')!;
  const menuItems = actionsMenu.useMenuItems();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            icon={<EllipsisIcon />}
            aria-label={messages.actionsMenu.actions}
          />
        }
      />
      <DropdownMenuContent side="bottom" align="end">
        {menuItems.map((menuItem) => (
          <menuItem.component key={menuItem.id} params={menuItem.params} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
