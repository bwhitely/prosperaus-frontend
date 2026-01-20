import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { filter, switchMap } from 'rxjs/operators';
import { BankStatementService } from '../../../../core/services/bank-statement.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import {
  BankStatementUploadResponse,
  BankTransactionResponse,
  ExpenseCategoryResponse,
  StatementAnalysisResponse,
  BankFormat,
  BANK_FORMAT_OPTIONS
} from '../../../../shared/models/cash-flow.model';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltip } from "@angular/material/tooltip";
import { MatDialog } from '@angular/material/dialog';
import { MigrationDialogComponent } from '../migration-dialog/migration-dialog.component';

@Component({
  selector: 'app-statement-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, MatIconModule, MatButtonModule, MatTooltip],
  templateUrl: './statement-upload.component.html',
  styleUrl: './statement-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatementUploadComponent implements OnInit {
  private fb = inject(FormBuilder);
  private statementService = inject(BankStatementService);
  private expenseService = inject(ExpenseService);
  private confirmDialog = inject(ConfirmDialogService);
  private dialog = inject(MatDialog);

  uploads = signal<BankStatementUploadResponse[]>([]);
  categories = signal<ExpenseCategoryResponse[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Upload state
  isUploading = signal(false);
  uploadProgress = signal<string | null>(null);
  isDragOver = signal(false);
  selectedFile = signal<File | null>(null);
  isPdfFile = signal(false);

  // Bank format options for PDF uploads
  bankFormatOptions = BANK_FORMAT_OPTIONS;

  // Transactions view
  selectedUpload = signal<BankStatementUploadResponse | null>(null);
  transactions = signal<BankTransactionResponse[]>([]);
  isLoadingTransactions = signal(false);

  // Analysis state
  isAnalysing = signal(false);
  analysisResult = signal<StatementAnalysisResponse | null>(null);
  showAnalysisResults = signal(false);

  uploadForm: FormGroup = this.fb.group({
    accountName: [''],
    institution: [''],
    bankFormat: [''],
    password: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    Promise.all([
      this.statementService.getUploads().toPromise(),
      this.expenseService.getCategories().toPromise()
    ]).then(([uploads, categories]) => {
      this.uploads.set(uploads || []);
      this.categories.set(categories || []);
      this.isLoading.set(false);
    }).catch(() => {
      this.error.set('Failed to load statements');
      this.isLoading.set(false);
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
      input.value = ''; // Reset for future uploads
    }
  }

  handleFile(file: File): void {
    const filename = file.name.toLowerCase();
    const isCsv = filename.endsWith('.csv');
    const isPdf = filename.endsWith('.pdf');

    if (!isCsv && !isPdf) {
      this.error.set('Only CSV and PDF files are supported');
      return;
    }

    // Store file and set PDF flag
    this.selectedFile.set(file);
    this.isPdfFile.set(isPdf);

    // For PDF files, wait for user to select bank format before uploading
    if (isPdf) {
      this.error.set(null);
      return; // Don't auto-upload, wait for form submission
    }

    // For CSV files, upload immediately
    this.uploadFile(file);
  }

  uploadFile(file: File): void {
    const formValue = this.uploadForm.value;
    const isPdf = file.name.toLowerCase().endsWith('.pdf');

    // Validate bank format is selected for PDF
    if (isPdf && !formValue.bankFormat) {
      this.error.set('Please select your bank for PDF uploads');
      return;
    }

    this.isUploading.set(true);
    this.uploadProgress.set('Uploading and categorizing...');
    this.error.set(null);

    this.statementService.uploadStatement(file, {
      accountName: formValue.accountName || undefined,
      institution: formValue.institution || undefined,
      bankFormat: isPdf ? formValue.bankFormat : undefined,
      password: isPdf && formValue.password ? formValue.password : undefined
    }).subscribe({
      next: (upload) => {
        const catMsg = upload.categorisedCount > 0
          ? ` (${upload.categorisedCount} auto-categorized)`
          : '';
        this.uploadProgress.set(`Processed ${upload.transactionCount} transactions${catMsg}`);
        setTimeout(() => {
          this.isUploading.set(false);
          this.uploadProgress.set(null);
          this.selectedFile.set(null);
          this.isPdfFile.set(false);
          this.uploadForm.patchValue({ bankFormat: '', password: '' });
          this.loadData();
        }, 1500);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to upload statement');
        this.isUploading.set(false);
        this.uploadProgress.set(null);
      }
    });
  }

  uploadSelectedPdf(): void {
    const file = this.selectedFile();
    if (file) {
      this.uploadFile(file);
    }
  }

  cancelPdfUpload(): void {
    this.selectedFile.set(null);
    this.isPdfFile.set(false);
    this.uploadForm.patchValue({ bankFormat: '', password: '' });
  }

  viewTransactions(upload: BankStatementUploadResponse): void {
    this.selectedUpload.set(upload);
    this.isLoadingTransactions.set(true);

    this.statementService.getTransactions(upload.id).subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
        this.isLoadingTransactions.set(false);
      },
      error: () => {
        this.error.set('Failed to load transactions');
        this.isLoadingTransactions.set(false);
      }
    });
  }

  closeTransactions(): void {
    this.selectedUpload.set(null);
    this.transactions.set([]);
  }

  deleteUpload(upload: BankStatementUploadResponse): void {
    this.confirmDialog.confirmDelete(upload.filename, 'All transactions will be removed.')
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.statementService.deleteUpload(upload.id))
      )
      .subscribe({
        next: () => this.loadData(),
        error: () => this.error.set('Failed to delete statement')
      });
  }

  categoriseTransaction(transaction: BankTransactionResponse, categoryId: string): void {
    this.statementService.categoriseTransaction(transaction.id, { categoryId }).subscribe({
      next: (updated) => {
        // Update transaction in list
        const current = this.transactions();
        const index = current.findIndex(t => t.id === transaction.id);
        if (index >= 0) {
          const newList = [...current];
          newList[index] = updated;
          this.transactions.set(newList);
        }
      },
      error: () => this.error.set('Failed to categorise transaction')
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status--success';
      case 'processing': return 'status--warning';
      case 'failed': return 'status--error';
      default: return '';
    }
  }

  formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  }

  // Analysis methods

  analyseStatement(upload: BankStatementUploadResponse): void {
    this.isAnalysing.set(true);
    this.error.set(null);

    this.statementService.analyseStatement(upload.id).subscribe({
      next: (result) => {
        this.analysisResult.set(result);
        this.showAnalysisResults.set(true);
        this.isAnalysing.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to analyse statement. Please try again.');
        this.isAnalysing.set(false);
      }
    });
  }

  analyseAllStatements(): void {
    if (this.uploads().length === 0) {
      this.error.set('No statements to analyse. Upload a statement first.');
      return;
    }

    this.isAnalysing.set(true);
    this.error.set(null);

    this.statementService.analyseAllStatements().subscribe({
      next: (result) => {
        this.analysisResult.set(result);
        this.showAnalysisResults.set(true);
        this.isAnalysing.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to analyse statements. Please try again.');
        this.isAnalysing.set(false);
      }
    });
  }

  closeAnalysisResults(): void {
    this.showAnalysisResults.set(false);
    this.analysisResult.set(null);
  }

  applySuggestions(): void {
    const result = this.analysisResult();
    if (!result || !result.uploadId) return;

    this.statementService.applySuggestions(result.uploadId, result.categorySuggestions).subscribe({
      next: () => {
        this.closeAnalysisResults();
        this.loadData();
        // Refresh transactions if viewing
        const selected = this.selectedUpload();
        if (selected) {
          this.viewTransactions(selected);
        }
      },
      error: () => this.error.set('Failed to apply suggestions')
    });
  }

  getSpendingCategories(): { name: string; amount: number; percentage: number }[] {
    const result = this.analysisResult();
    if (!result) return [];

    const entries = Object.entries(result.spendingSummary.spendingByCategory);
    const total = result.spendingSummary.totalSpending || 1;

    return entries
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: (amount / total) * 100
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  openMigrationDialog(): void {
    const dialogRef = this.dialog.open(MigrationDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Migration was successful, reload data
        this.loadData();
      }
    });
  }
}
