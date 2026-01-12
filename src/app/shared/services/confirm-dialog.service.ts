import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  /**
   * Opens a confirmation dialog and returns an Observable<boolean>.
   * Returns true if confirmed, false if cancelled.
   */
  confirm(options: ConfirmDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: options,
      autoFocus: false,
      panelClass: 'confirm-dialog-panel'
    });

    return dialogRef.afterClosed().pipe(
      map(result => result === true)
    );
  }

  /**
   * Convenience method for delete confirmations.
   */
  confirmDelete(itemName: string, additionalMessage?: string): Observable<boolean> {
    const message = additionalMessage
      ? `Are you sure you want to delete "${itemName}"? ${additionalMessage}`
      : `Are you sure you want to delete "${itemName}"?`;

    return this.confirm({
      title: 'Confirm Delete',
      message,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'warn'
    });
  }
}
